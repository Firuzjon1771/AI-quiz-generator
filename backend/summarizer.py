from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer
import re
model_name = "facebook/bart-large-cnn"
model     = AutoModelForSeq2SeqLM.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)
max_len = model.config.max_position_embeddings  
summarizer = pipeline(
  "summarization",
  model=model,
  tokenizer=tokenizer,
)
def clean_summary(text: str) -> str:
    text = re.sub(r"http[s]?://\S+", "", text)
    text = re.sub(r"Back to .*?\.", "", text)
    text = re.sub(r"(?i)(the article|the page|this story).*", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    sentences = re.split(r'(\.|!|\?)\s', text)
    limited = " ".join(sentences[:10])
    return limited.strip()

def summarize_text(text):
    truncated = text[:1000]   
    return summarizer(truncated, max_length=300, min_length=80, do_sample=False)[0]["summary_text"]
