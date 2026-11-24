export function authErrorMessage(error: unknown, fallback = "Não foi possível concluir a operação."): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";

  if (/Failed to fetch|NetworkError|fetch failed|Network request failed|ECONNREFUSED/i.test(message)) {
    return "Não foi possível conectar. Tente novamente em instantes.";
  }
  if (/Email ou senha incorretos|Já existe uma conta|nome de usuário|Muitas tentativas|senha deve|senha de 8|e-mail válido|email inválido|Informe seu|A senha deve|Use uma senha/i.test(message)) {
    return message;
  }
  return fallback;
}
