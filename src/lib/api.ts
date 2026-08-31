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
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(`El menú respondió con error ${res.status}`);
  }
  return res.json();
}

async function postOrder(url: string, payload: unknown): Promise<{ ok: boolean }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
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
    if (err instanceof ApiError) throw err; // validation error, retry won't help
    try {
      return await postOrder(url, payload);
    } catch (err2) {
      if (err2 instanceof ApiError) throw err2;
      throw new ApiError('No se pudo enviar el pedido, intentá de nuevo');
    }
  }
}
