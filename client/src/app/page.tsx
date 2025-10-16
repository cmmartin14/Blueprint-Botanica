import { Navbar, Canvas, SearchWindow, VariableWindow } from "@/components";

export default function Home() {
  return (
    <>
      <Canvas />
      <SearchWindow isOpen={false} />
      <VariableWindow isOpen={false} />
    </>
  );
}
