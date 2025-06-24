import Home from "~/components/guest/home";
import { auth } from "~/server/auth";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const userExists = user ? true : false;
  return <Home user={userExists} />;
}
