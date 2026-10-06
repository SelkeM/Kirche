import { getChatGPTUser } from '../app/chatgpt-auth';
export async function isAdmin() {
  const user = await getChatGPTUser();
  return !!user && user.email.toLowerCase() === 'andre.gerbrand@gmail.com';
}
