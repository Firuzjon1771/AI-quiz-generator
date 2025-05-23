import json
import random
import re

import numpy as np
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
from answer_postprocessor import clean_answer
from key_phrase_extraction import extract_key_phrases
import spacy

_NLP = spacy.load("en_core_web_sm")

with open("topic_keywords_100plus_expanded.json", "r") as f:
    TOPIC_KEYWORDS = json.load(f)

class QuestionGenerator:
    def __init__(self,
                 expanded_path="question_templates_expanded.json",
                 updated_path="question_templates_updated.json",
                 use_neural=True):
        try:
            with open(expanded_path, "r") as f:
                raw_exp = json.load(f)
            self.templates = [e["Template"] for e in raw_exp]
        except Exception as e:
            print(f"[WARN] Could not load {expanded_path}: {e}")
            self.templates = ["What is {}?", "Explain how {} works."]

        try:
            with open(updated_path, "r") as f:
                raw_upd = json.load(f)
            self.templates_updated = [e["Template"] for e in raw_upd]
        except Exception as e:
            print(f"[WARN] Could not load {updated_path}: {e}")
            self.templates_updated = []

        self.qa_model = pipeline(
            "question-answering",
            model="distilbert-base-cased-distilled-squad"
        )

        self.use_neural = use_neural
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        if self.use_neural:
            self.flan_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
            self.flan_model = AutoModelForSeq2SeqLM.from_pretrained(
                "google/flan-t5-base"
            ).to(self.device)

        self.summarizer = pipeline(
            "summarization",
            model="google/flan-t5-base",
            device=0 if torch.cuda.is_available() else -1
        )

    def summarize(self, text: str, max_length: int = 150, min_length: int = 50) -> str:
        """
        Use Flan-T5 to produce a summary.
        """
        result = self.summarizer(
            text,
            max_length=max_length,
            min_length=min_length,
            do_sample=False
        )
        return result[0]["summary_text"]
    def _default_templates(self):
        return [
            "What is {}?",
            "Explain how {} works.",
            "What are the advantages of using {}?",
            "How does {} impact modern technology?",
            "What challenges arise when using {}?"
        ]

    def _generate_candidate_distractors(self, question: str) -> list[str]:
        """
        Pull out all noun-chunks and single-word NOUN/PROPN tokens
        from the question, to use as raw distractor candidates.
        """
        doc = _NLP(question)
        chunks = [chunk.text.strip() for chunk in doc.noun_chunks]
        single_nouns = [
            tok.text.strip()
            for tok in doc
            if tok.pos_ in ("NOUN", "PROPN") and tok.is_alpha and len(tok.text) > 1
        ]
        return list({*chunks, *single_nouns})

    def convert_to_multiple_choice(self, question: str, answer: str, num_choices: int = 4):
        correct = answer.strip()
        distractors = []

        matched_topic = None
        question_lower = question.lower()
        
        for topic, keywords in TOPIC_KEYWORDS.items():
            if any(k.lower() in question_lower for k in keywords):
                matched_topic = topic
                break

        if matched_topic:
            pool = [kw for kw in TOPIC_KEYWORDS[matched_topic] if kw.lower() != correct.lower()]
            distractors = random.sample(pool, min(len(pool), num_choices - 1))
        else:
            flat_keywords = [
                kw for kws in TOPIC_KEYWORDS.values() for kw in kws
                if kw.lower() != correct.lower()
            ]
            distractors = random.sample(flat_keywords, min(len(flat_keywords), num_choices - 1))

        while len(distractors) < num_choices - 1:
            distractors.append("Unrelated concept")

        options = distractors + [correct]
        random.shuffle(options)
        return options


    def generate_per_keyword(self,
                             topic: str,
                             content: str,
                             total_count: int,
                             keywords: list) -> list:
        """
        New per-keyword logic.
        Uses only self.templates_updated (which have {keyword} and {topic})
        and falls back to generate_questions() if needed.
        Returns a list of (question, answer) tuples.
        """
        qa_pairs = []

        present = [kw for kw in keywords if kw.lower() in content.lower()]

        pool = self.templates_updated or []
        if not pool:
            pool = [ "Define {keyword} in the context of {topic}?" ]

        for kw in present:
            tpl = random.choice(pool)
            try:
                q = tpl.format(keyword=kw, topic=topic)
            except Exception:
                q = f"Define {kw} in the context of {topic}?"
            ans = self.qa_model({"question": q, "context": content})["answer"]
            qa_pairs.append((q, clean_answer(ans)))
            if len(qa_pairs) >= total_count:
                break

        if len(qa_pairs) < total_count:
            need = total_count - len(qa_pairs)
            tail = self.generate_questions(
                topic, content,
                num_questions=need,
                open_count=need,
                mc_count=0
            )
            qa_pairs.extend(tail)

        return qa_pairs[:total_count]
    def _generate_candidate_distractors(self, question):
        """
        Try key-phrase extraction, flattening nested lists or numpy arrays,
        then fallback to splitting the question text itself into words.
        """
        try:
            raw = extract_key_phrases(question)
            if isinstance(raw, np.ndarray):
                raw = raw.tolist()
            flat = []
            for x in raw:
                if isinstance(x, (list, tuple)):
                    flat += [str(w) for w in x]
                else:
                    flat.append(str(x))
            # dedupe, strip
            seen, cands = set(), []
            for w in flat:
                w = w.strip()
                lw = w.lower()
                if w and lw not in seen:
                    seen.add(lw)
                    cands.append(w)
            if cands:
                return cands
        except Exception:
            pass

        words = re.findall(r"\b[A-Za-z]{4,}\b", question)
        seen, cands = set(), []
        for w in words:
            lw = w.lower()
            if lw not in seen:
                seen.add(lw)
                cands.append(w)
        return cands
    def generate_questions(self,
                           topic: str,
                           content: str,
                           num_questions: int = 10,
                           open_count: int = None,
                           mc_count: int = None) -> list:
        """
        Your existing topic-based generation logic.
        Uses self.templates (expanded JSON with {} placeholders).
        """
        if open_count is None or mc_count is None:
            open_count = num_questions
            mc_count   = 0

        print(f"Generating {num_questions} questions ({open_count} open, {mc_count} MC)")

        candidates = []
        if open_count > 0:
            candidates += self._generate_open_questions(topic, content, open_count)
        if mc_count > 0:
            candidates += self._generate_mc_questions(topic, content, mc_count)

        # Dedupe & trim to num_questions
        seen, final = set(), []
        for item in candidates:
            key = json.dumps(item, sort_keys=True) if isinstance(item, dict) else tuple(item)
            if key not in seen:
                seen.add(key)
                final.append(item)
            if len(final) >= num_questions:
                break

        return final
    def _generate_open_questions(self, topic, content, count):
        return (
            self.generate_questions(
                topic, content, num_questions=count, open_count=count, mc_count=0
            )
            if False
            else self._generate_template_then_neural(topic, content, count)
        )

    def _generate_template_then_neural(self, topic, content, count):
        """
        Combination of template‐based & neural to get `count` open questions.
        """
        results = []
        used_answers = set()
        batch = []
        selected = random.sample(self.templates, min(5 * count, len(self.templates)))
        for tpl in selected:
            if tpl.count("{}") == 1:
                q = tpl.format(topic)
            else:
                q = tpl.format(topic, topic)
            if f"{topic} and {topic}" in q or f"{topic} vs {topic}" in q:
                continue
            batch.append({"question": q, "context": content})

        for i in range(0, len(batch), 5):
            resp = self.qa_model(batch[i : i + 5])
            for idx, out in enumerate(resp):
                question = batch[i + idx]["question"]
                raw = out.get("answer", "") if isinstance(out, dict) else out
                score = out.get("score", 0) if isinstance(out, dict) else None
                ans = clean_answer(raw)
                if score is not None and score < 0.05:
                    continue
                if not ans or ans in used_answers:
                    continue
                used_answers.add(ans)
                results.append((question, ans))
                if len(results) >= count:
                    return results

        if self.use_neural and len(results) < count:
            extras = self._generate_neural_questions(content)
            for q, a in extras:
                if len(results) >= count:
                    break
                if (q, a) not in results:
                    results.append((q, a))

        return results[:count]



    def _parse_mc_output(self, text):
        """
        Expect lines like:
        1. Question?
        A. Opt1
        B. Opt2
        C. Opt3
        D. Opt4
        Answer: B
        """
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        qa = []
        i = 0
        while i < len(lines):
            if lines[i][0].isdigit() and lines[i].endswith("?"):
                question = lines[i].split(".", 1)[1].strip()
                opts = []
                i += 1
                while i < len(lines) and lines[i][0] in "ABCD":
                    opts.append(lines[i])
                    i += 1
                answer = None
                if i < len(lines) and lines[i].startswith("Answer"):
                    answer = lines[i].split(":", 1)[1].strip()
                    i += 1
                qa.append({
                    "type": "mc",
                    "question": question,
                    "options": opts,
                    "answer": answer
                })
            else:
                i += 1
        return qa

    def _generate_neural_questions(self, content):
        """
        Simple FLAN‐T5 shot for open Q&A
        """
        prompt = f"Generate 10 educational questions with answers from this text:\n\n{content}"
        inputs = self.flan_tokenizer(
            prompt, return_tensors="pt", truncation=True, max_length=1024
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            out_ids = self.flan_model.generate(
                **inputs,
                max_new_tokens=512,
                num_beams=4,
                temperature=0.7,
                early_stopping=True
            )
        decoded = self.flan_tokenizer.decode(out_ids[0], skip_special_tokens=True)
        return self._parse_flan_output(decoded)

    def _parse_flan_output(self, text):
        qa = []
        for line in text.strip().split("\n"):
            if "?" in line:
                q, _, a = line.partition("?")
                question = q.strip() + "?"
                answer = a.strip(":").strip()
                if question and answer:
                    qa.append((question, answer))
        return qa


