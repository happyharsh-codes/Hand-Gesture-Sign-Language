import "./page.css";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

import Link from "next/link";

export default function Page() {



  return(
    <>
    <Navbar/>
    <main className="dashboard">
      <Link href="/live-cam" className="live-cam-btn" >Live Cam</Link>
      <Link href = "/display" className="display-results-btn">Display Results</Link>
    </main>
    <Footer/>
    </>
  )
}