export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchMenu(url: string): Promise<MenuItem[]> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError('No se pudo conectar al menú');
  }
  if (!res.ok) {
    throw new ApiError(`El menú respondió con error ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    throw new ApiError('El menú respondió con datos inválidos');
  }
}

async function postOrder(url: string, payload: unknown): Promise<{ ok: boolean }> {
  // A rejected fetch() means the request never reached the server (or the
  // response never arrived) — safe to retry. Anything after a response is
  // received (bad status, JSON parse failure, {ok:false}) must NOT retry,
  // since the row may already have been appended on the server.
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    throw networkErr;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('El pedido respondió con datos inválidos');
  }
  if (!res.ok || (data && data.ok === false)) {
    throw new ApiError(data?.error || `El pedido respondió con error ${res.status}`);
  }
  return data;
}

export async function submitOrder(
  url: string,
  payload: unknown
): Promise<{ ok: boolean }> {
  try {
    return await postOrder(url, payload);
  } catch (err) {
    if (err instanceof ApiError) throw err; // response received, retry would duplicate the order
    // fetch() itself rejected (genuine connectivity failure) — safe to retry
    try {
      return await postOrder(url, payload);
    } catch (err2) {
      if (err2 instanceof ApiError) throw err2;
      throw new ApiError('No se pudo enviar el pedido, intentá de nuevo');
    }
  }
}
