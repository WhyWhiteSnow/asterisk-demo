"""Сериализация ответов AMI (panoramisk.Message) в стабильный JSON."""

from __future__ import annotations

from typing import Any


def serialize_ami_response(response: Any) -> dict[str, str | bool]:
    output_lines: list[str] = []

    content = getattr(response, "content", None)
    if content:
        output_lines.append(str(content).strip())

    output_header = None
    if hasattr(response, "get"):
        output_header = response.get("Output") or response.get("output")

    if output_header:
        if isinstance(output_header, list):
            output_lines.extend(str(line) for line in output_header if line)
        else:
            output_lines.append(str(output_header))

    if hasattr(response, "iter_lines"):
        for line in response.iter_lines():
            text = str(line).strip()
            if text and text not in output_lines:
                output_lines.append(text)

    output_text = "\n".join(output_lines).strip()
    if not output_text:
        response_status = getattr(response, "response", None)
        if response_status:
            output_text = f"Response: {response_status}"
        elif hasattr(response, "get") and response.get("Response"):
            output_text = f"Response: {response['Response']}"

    success = bool(getattr(response, "success", False))

    return {"output": output_text, "success": success}
