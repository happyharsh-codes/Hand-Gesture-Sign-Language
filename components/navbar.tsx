import { GiHamburgerMenu } from "react-icons/gi"

export default function Navbar() {

    return (
        <header className="navbar">
            <section className="navbar-left">
                <div className="navbar-logo">
                    <h1>HAND GESTURE</h1>
                </div>
            </section>
            <section className="navbar-right">
                <div className="navbar-icon">
                    <GiHamburgerMenu/>
                </div>
            </section>
        </header>
    )
}