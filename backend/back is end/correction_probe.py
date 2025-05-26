from transformers import GPT2LMHeadModel, GPT2Tokenizer

gpt2_tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
gpt2_model = GPT2LMHeadModel.from_pretrained("gpt2")

def correct_and_probe(text):
    prompt = f"The user believes: {text}. Correct this and ask a probing question."
    inputs = gpt2_tokenizer(prompt, return_tensors="pt")
    outputs = gpt2_model.generate(inputs["input_ids"], max_length=100)
    return gpt2_tokenizer.decode(outputs[0], skip_special_tokens=True)
