/** O modo local não envia telemetria para serviços externos. */
export function reportLovableError(_error: unknown, _context?: Record<string, unknown>) {
  // Intencionalmente vazio: os erros continuam aparecendo no console local.
}
