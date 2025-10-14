import Canvas from "../components/Canvas";
import SearchWindow from "@/components/Searchwindow";

export default function Home() {
  return (
    <>
      <Canvas />
      <SearchWindow isOpen={false} />
    </>
  );
}
