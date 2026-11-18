/** Mensagens amigáveis da autenticação local. Google requer serviço OAuth externo. */
export async function signInWithGoogle(): Promise<{error:Error|null;redirected:boolean}> {
  return {error:new Error('O login com Google não está disponível no modo local. Entre com email e senha.'),redirected:false};
}
export function authErrorMessage(error:unknown,fallback='Não foi possível concluir a operação.'):string {
  const msg = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if(/Failed to fetch|NetworkError/i.test(msg)) return 'O servidor local não está iniciado. Execute npm run dev na pasta do Melodica.';
  if(/O login com Google/.test(msg)) return msg;
  if(/Email ou senha incorretos|Já existe uma conta|nome de usuário|Muitas tentativas|senha deve|senha de 8|e-mail válido/i.test(msg)) return msg;
  return msg || fallback;
}
