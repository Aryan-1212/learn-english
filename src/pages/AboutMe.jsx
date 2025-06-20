import React from "react";
import { ArrowLeft, Linkedin, Github, Instagram } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutMe = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4 pt-20 sm:p-6 sm:pt-20 md:p-8 md:pt-24 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-50 flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-semibold shadow-lg transition-all duration-200"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 sm:p-6 md:p-8 max-w-4xl w-full border border-white/20 flex flex-col lg:flex-row items-center lg:items-start gap-8">
        {/* Image & Socials Section */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/assets/image.jpg"
            alt="Profile"
            className="w-48 h-56 sm:w-56 sm:h-64 lg:w-64 lg:h-80 rounded-2xl border-4 border-purple-400 shadow-lg object-cover"
          />
          {/* Social Icons */}
          <div className="flex gap-4 mt-6 w-full justify-center">
            <a
              href="https://www.linkedin.com/in/aryan-parvani-1a1b0b250/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 hover:bg-blue-600 text-white p-3 rounded-full transition-colors shadow-lg"
              title="LinkedIn"
            >
              <Linkedin className="w-6 h-6" />
            </a>
            <a
              href="https://github.com/Aryan-1212"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 hover:bg-gray-800 text-white p-3 rounded-full transition-colors shadow-lg"
              title="GitHub"
            >
              <Github className="w-6 h-6" />
            </a>
            <a
              href="https://www.instagram.com/aryan_parvani/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 hover:bg-pink-600 text-white p-3 rounded-full transition-colors shadow-lg"
              title="Instagram"
            >
              <Instagram className="w-6 h-6" />
            </a>
          </div>
        </div>
        {/* Description Section */}
        <div className="flex-1 flex flex-col justify-start items-center lg:items-start text-center lg:text-left w-full">
          <h2 className="text-3xl font-bold text-white mb-2">Aryan Parvani</h2>
          <p className="text-purple-200 mb-4">I write code</p>
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-white w-full">
            <p className="mb-2">
              Hi! I'm Aryan, the creator of this English Practice Bot. I'm a
              computer engineering student at the L.D. College of Engineering, Ahmedabad.
              I'm a passionate developer and I love to code.
            </p>
            <p className="mb-2">
              I designed this app to make English learning fun, accessible, and
              efficient for everyone — whether you're just starting or
              sharpening your skills.
            </p>
            <p className="mb-2">
              Feel free to explore the app and reach out if you have any
              feedback or suggestions!
            </p>
            <p className="text-purple-300 mt-4">
              Contact: 6353953587
            </p>
            <p className="text-purple-300 mt-4">
              Mail: aryanparvani12@email.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutMe;
