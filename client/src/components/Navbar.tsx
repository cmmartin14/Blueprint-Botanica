"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

import SearchWindow from "./Searchwindow";
import VariableWindow from "./VariableWindow";

import { GiOakLeaf } from "react-icons/gi";
import { TbHomeEdit, TbCircleXFilled } from "react-icons/tb";
import { Color } from 'fabric';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [date, setDate] = useState("");
  const [temp, setTemp] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariableOpen, setIsVariableOpen] = useState(false);

  const toggleSearchWindow = () => setIsSearchOpen((prev) => !prev);
  const toggleVariableWindow = () => setIsVariableOpen((prev) => !prev);

  useEffect(() => {
    // format today’s date
    const now = new Date();
    setDate(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
    // fetch temperature for a location (example: Austin, TX)
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=30.27&longitude=-97.74&current=temperature_2m"
    )
      .then((res) => res.json())
      .then((data) => setTemp(data.current.temperature_2m))
      .catch((err) => console.error("Weather fetch error:", err));
  }, []);

  return (
    <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ml-0">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 flex flex-row">
            <GiOakLeaf size={45} className='mr-2' style={{ color: '#B7C398' }}/>
            <div className=''>
              <Link href="/" className=" text-xl font-bold hover:text-green-600 transition-colors flex flex-row"
               style={{ color: '#B7C398' }}
              >              
                Blueprint Botanica
              </Link>

              <div className="text-green-800 text-sm font-medium ml-0.5"
               style={{ color: '#B7C398' }}
              >
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            <div className='flex flex-column ml-1.5 text-xs font-xs'>
              <button
                onClick={toggleVariableWindow}
                className="p-3 rounded-xl"
                title="Variable / Zipcode"
                style={{ color: '#B7C398' }}
              >
                <TbHomeEdit size={27}/>
              </button>
            </div>
            
            <div className='font-medium mt-3'
             style={{ color: '#B7C398' }}
            >
              {temp !== null && ` ${temp.toFixed(0)}°C`}
            </div>           
          </div>

          <SearchWindow isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          <VariableWindow isOpen={isVariableOpen} onClose={() => setIsVariableOpen(false)} />

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/" className="text-green-900 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
               style={{ color: '#B7C398' }}
              >
                Home
              </Link>
              <Link href="/about" className="text-green-900 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
               style={{ color: '#B7C398' }}
              >
                About
              </Link>
              <Link href="/services" className="text-green-900 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
               style={{ color: '#B7C398' }}
              >
                Services
              </Link>
              <Link href="/contact" className="text-green-900 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
               style={{ color: '#B7C398' }}
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-green-900 hover:text-green-600 inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-900"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#F4F0E0]">
          <Link
            href="/"
            className="text-green-900 hover:text-green-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-green-900 hover:text-green-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            About
          </Link>
          <Link
            href="/services"
            className="text-green-900 hover:text-green-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Services
          </Link>
          <Link
            href="/contact"
            className="text-green-900 hover:text-green-600 block px-3 py-2 rounded-md text-base font-medium transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
