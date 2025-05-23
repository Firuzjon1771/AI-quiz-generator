import spacy
from sklearn.feature_extraction.text import TfidfVectorizer

nlp = spacy.load("en_core_web_sm")

def extract_key_phrases(text):
    doc = nlp(text)
    tokens = [token.text for token in doc if not token.is_stop and not token.is_punct]

    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform([' '.join(tokens)])
    feature_names = tfidf.get_feature_names_out()

    key_phrases = [feature_names[i] for i in tfidf_matrix.sum(axis=0).argsort()[0, ::-1][:10]]
    return key_phrases
