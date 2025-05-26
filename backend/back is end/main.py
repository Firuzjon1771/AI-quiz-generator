
import logging
from question_generation import QuestionGenerator
from topic_detection import TopicDetector

logging.basicConfig(level=logging.INFO)

def main():
    try:
        detector = TopicDetector("topic_keywords_100plus_expanded.json")

        filepath = "sample.txt"
        detected_topic, content = detector.detect_topic_from_file(filepath)

        logging.info(f"Detected Topic: {detected_topic}")
        logging.info(f"Content preview: {content[:200]}...")

        question_generator = QuestionGenerator(
            "question_templates_expanded.json",
            use_neural=True
        )
        questions = question_generator.generate_questions(
            detected_topic,
            content,
            num_questions=10
        )

        for idx, q in enumerate(questions, start=1):
            if isinstance(q, tuple):
                question, answer = q
                print(f"{idx}. [Open] Q: {question}\n   A: {answer}\n")
            elif isinstance(q, dict) and q.get("type") == "mc":
                print(f"{idx}. [MC] Q: {q['question']}")
                for opt in q.get("options", []):
                    mark = "(correct)" if opt.get("correct") else ""
                    print(f"   - {opt['text']} {mark}")
                print()
            else:
                print(f"{idx}. [Unknown] {q}\n")

    except Exception as e:
        logging.error(f"Error occurred: {e}")

if __name__ == "__main__":
    main()
