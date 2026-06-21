"""Порты SIP: публичный (nginx) и backend (docker publish на localhost)."""

SIP_BACKEND_PORT_OFFSET = 10000


def sip_backend_host_port(sip_port: int) -> int:
    """
    Host-порт для docker publish Asterisk SIP.

    nginx слушает 0.0.0.0:<sip_port>; тот же порт на 127.0.0.1 занять нельзя.
    Asterisk публикуется на 127.0.0.1:<sip_port + OFFSET> -> container:<sip_port>.
    """
    return sip_port + SIP_BACKEND_PORT_OFFSET
