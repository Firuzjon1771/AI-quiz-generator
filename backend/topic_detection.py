import json
import re
from typing import Dict
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline

class TopicDetector:
    def __init__(self, topic_file: str = "topic_keywords_100plus_expanded.json"):
        self.topic_keywords = self._load_topic_keywords(topic_file)
        self.classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.topic_list = list(self.topic_keywords.keys())

    def _load_topic_keywords(self, filepath: str) -> Dict[str, list]:
        with open(filepath, 'r') as f:
            return json.load(f)

    def detect_topics(self, text: str, method: str = "hybrid", top_n: int = 3) -> dict:
        text = text.lower()
        topic_scores = {}
        scores = {}

        if method in ["hybrid", "keywords"]:
            for topic, keywords in self.topic_keywords.items():
                matches = [k for k in set(keywords) if re.search(r'\b' + re.escape(k.lower()) + r'\b', text)]
                score = len(matches)
                if topic.lower() in text:
                    score += 3
                if score > 0:
                    scores[topic] = score

        if method in ["hybrid", "zero-shot"]:
            z_result = self.classifier(text, self.topic_list)
            for label, score in zip(z_result["labels"], z_result["scores"]):
                scores[label] = scores.get(label, 0) + int(score * 10)

        if method == "embedding":
            text_vec = self.embedder.encode(text, convert_to_tensor=True)
            topic_vecs = self.embedder.encode(self.topic_list, convert_to_tensor=True)
            cos_sim = util.cos_sim(text_vec, topic_vecs)[0]
            for idx, topic in enumerate(self.topic_list):
                scores[topic] = float(cos_sim[idx]) * 10

        if not scores:
            return {"Primary": "General", "Scores": {}}

        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_matches = sorted_scores[:top_n]

        result = {
            "Primary": top_matches[0][0],
            "Scores": {k: v for k, v in top_matches}
        }
        if len(top_matches) > 1: result["Secondary"] = top_matches[1][0]
        if len(top_matches) > 2: result["Tertiary"] = top_matches[2][0]
        
        return result
