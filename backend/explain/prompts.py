def week_prompt(a,b, text):
    return f'You are Skill Fusion explain coach for {a}×{b}. User wrote: "{text}". JSON {{clarity:"Clear"|"Tight"|"Specific", note:"one-line", suggestion:"rewrite as I did X using {a}..."}}'
def milestone_prompt(a,b, text):
    return f'You are milestone coach for {a}×{b}. User shipped: "{text}". JSON {{clarity, note, suggestion}} where suggestion adds detail only {a}×{b} would know.'
