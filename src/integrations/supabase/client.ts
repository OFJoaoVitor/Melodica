/**
 * Adaptador para a API local SQLite do Melodica.
 * Mantém a interface utilizada pelas telas existentes (auth e consultas encadeadas).
 * Não utiliza Supabase nem Lovable Cloud.
 */
type LocalUser = { id: string; email: string };
type LocalSession = { user: LocalUser; access_token: string };
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED";
type Result = { data: any; error: Error | null };
const listeners = new Set<(event: AuthEvent, session: LocalSession | null) => void>();
let activeSession: LocalSession | null = null;
const makeSession = (user: LocalUser | null) => user ? { user, access_token: "local-cookie" } : null;
function notify(event: AuthEvent, session: LocalSession | null) {
  activeSession = session;
  for (const listener of listeners) listener(event, session);
}
function apiBase() {
  if (typeof window === "undefined") return "http://127.0.0.1:8787/api";
  // Usa o mesmo hostname do site: localhost ou 127.0.0.1 para o cookie funcionar.
  return `http://${window.location.hostname}:8787/api`;
}
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message || `Erro ${response.status}`);
  return value;
}
function wrapError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
class LocalQuery {
  private filters: { column: string; operator: string; value: unknown }[] = [];
  private fields = "*";
  private orderField = "";
  private ascending = false;
  private max = 1000;
  private method = "GET";
  private payload: unknown;
  private one = false;

  constructor(private table: string) {}
  select(fields = "*") { this.fields = fields; return this; }
  eq(column: string, value: unknown) { this.filters.push({column,operator:"eq",value}); return this; }
  neq(column: string, value: unknown) { this.filters.push({column,operator:"neq",value}); return this; }
  in(column: string, value: unknown[]) { this.filters.push({column,operator:"in",value}); return this; }
  order(column: string, options?: {ascending?:boolean}) { this.orderField = column; this.ascending=!!options?.ascending; return this; }
  limit(max: number) { this.max = max; return this; }
  maybeSingle() {this.one = true;return this;}
  single() {this.one = true;return this;}
  insert(payload: unknown) {this.method="POST";this.payload=payload;return this;}
  update(payload: unknown) {this.method="PATCH";this.payload=payload;return this;}
  delete() {this.method="DELETE";return this;}

  private async run(): Promise<Result> {
    try {
      const qs = new URLSearchParams({ filters:JSON.stringify(this.filters),select:this.fields,limit:String(this.max) });
      if (this.orderField) {qs.set("order",this.orderField);qs.set("ascending",String(this.ascending));}
      const result = await request(`/data/${this.table}?${qs}`,{
        method:this.method,
        ...(this.payload!==undefined?{body:JSON.stringify(this.payload)}:{}),
      });
      const data = this.one ? result.data?.[0] ?? null : result.data ?? null;
      return { data, error:null };
    } catch(error) {
      return { data:null,error:wrapError(error) };
    }
  }
  then<T = Result, F = never>(resolve?: ((value: Result)=>T|PromiseLike<T>) | null, reject?: ((reason:unknown)=>F|PromiseLike<F>) | null): Promise<T|F> {
    return this.run().then(resolve,reject);
  }
}

export const supabase = {
  from(table: string) { return new LocalQuery(table); },
  auth: {
    async getUser() {
      try {
        const { user } = await request('/auth/me');
        activeSession = makeSession(user);
        return {data:{user: user as LocalUser | null},error:null};
      } catch(error) {return {data:{user:null},error:wrapError(error)};}
    },
    async getSession() {
      try {
        const { user } = await request('/auth/me');
        activeSession=makeSession(user);
        return {data:{session:activeSession},error:null};
      } catch(error) {return {data:{session:null},error:wrapError(error)};}
    },
    onAuthStateChange(callback:(event:AuthEvent, session:LocalSession|null)=>void) {
      listeners.add(callback);
      return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};
    },
    async signInWithPassword({email,password}:{email:string;password:string}) {
      try {
        const {user} = await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
        const session=makeSession(user);notify('SIGNED_IN',session);
        return {data:{user,session},error:null};
      }catch(error){return {data:{user:null,session:null},error:wrapError(error)};}
    },
    async signUp({email,password,options}:{email:string;password:string;options?:{data?:Record<string,unknown>;emailRedirectTo?:string}}) {
      try {
        const {user} = await request('/auth/register',{method:'POST',body:JSON.stringify({email,password,options})});
        const session=makeSession(user);notify('SIGNED_IN',session);
        return {data:{user,session},error:null};
      }catch(error){return {data:{user:null,session:null},error:wrapError(error)};}
    },
    async signOut() {
      try {await request('/auth/logout',{method:'POST',body:'{}'});notify('SIGNED_OUT',null);return {error:null};}
      catch(error){return {error:wrapError(error)};}
    },
    async updateUser({password}:{password?:string}) {
      if (!password) return {data:null,error:new Error('Alteração não suportada.')};
      try {
        const {user} = await request('/auth/change-password',{method:'POST',body:JSON.stringify({password})});
        notify('USER_UPDATED',makeSession(user));
        return {data:{user},error:null};
      } catch(error){return {data:null,error:wrapError(error)};}
    },
    async resetPasswordForEmail() {
      return {error:new Error('A recuperação de senha por email não está disponível no modo local. Consulte o README.')};
    },
    async signInWithOAuth() {
      return {error:new Error('Login com Google indisponível no modo local. Use email e senha.')};
    },
  },
};
