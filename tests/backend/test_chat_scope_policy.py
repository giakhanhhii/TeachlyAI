from src.chat_scope_policy import OUT_OF_SCOPE_REPLY, evaluate_chat_scope


def test_allows_english_learning_questions():
    decision = evaluate_chat_scope("Cách học từ vựng tiếng Anh hiệu quả cho học sinh lớp 12?")

    assert decision.allowed is True
    assert decision.reason == "english_teaching"


def test_allows_feature_help_questions():
    decision = evaluate_chat_scope("Card quiz trên web này dùng như thế nào?")

    assert decision.allowed is True
    assert decision.reason == "feature_help"


def test_blocks_other_subject_questions():
    decision = evaluate_chat_scope("Hãy giải thích kiến thức toán hàm số bậc hai.")

    assert decision.allowed is False
    assert decision.reason == "other_subject"
    assert decision.reply == OUT_OF_SCOPE_REPLY


def test_blocks_unrelated_questions():
    decision = evaluate_chat_scope("Hôm nay thời tiết thế nào?")

    assert decision.allowed is False
    assert decision.reason == "unrelated"
    assert decision.reply == OUT_OF_SCOPE_REPLY
