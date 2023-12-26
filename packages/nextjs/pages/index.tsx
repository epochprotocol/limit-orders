import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import Swap from "~~/components/swap";

const Home: NextPage = () => {
  return (
    <>
      <MetaHeader />
      <div className="mt-10 flex justify-center">
        <Swap />
      </div>
    </>
  );
};

export default Home;
