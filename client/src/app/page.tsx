import { Canvas, SearchWindow, VariableWindow } from "@/types";

export default function Home() {
  return (
    <>
      <Canvas />
      <SearchWindow isOpen={false} />
      <VariableWindow isOpen={false} />
    </>
  );
}
