from budget.budget.application.matching.normalizer import normalize


def test_identity_lowercases():
    assert normalize("TIM HORTONS #4521").value == "tim hortons #4521"


def test_empty():
    assert normalize("").value == ""