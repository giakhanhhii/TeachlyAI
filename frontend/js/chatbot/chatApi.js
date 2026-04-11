/**
 * @param {string} apiUrl
 * @param {string} message
 * @param {string} [threadId]
 */
export async function postChat(apiUrl, message, threadId) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Lỗi API");
  return data;
}
