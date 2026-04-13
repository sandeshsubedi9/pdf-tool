import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import blogs from "@/data/blogs.json";

export const metadata = {
  title: "Blog – SandeshPDF",
  description: "Read the latest tips, tricks, and guides about managing PDF files.",
};

export default function BlogListing() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">SandeshPDF Blog</h1>
          <p className="text-[#8C886B] leading-relaxed text-lg max-w-2xl mx-auto">
            Everything you need to know about compressing, splitting, merging, and beautifully managing your PDFs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogs.map((blog) => (
            <Link key={blog.id} href={`/blog/${blog.slug}`} className="block group">
              <div className="bg-white rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-shadow border border-[#EBEBEB] h-full flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {blog.coverImage && (
                  <img src={blog.coverImage} alt={blog.title} className="w-full h-48 object-cover rounded-xl mb-5 border border-[#EBEBEB]" />
                )}
                <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
                  {new Date(blog.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <h2 className="text-xl font-bold mb-3 text-[#1E1702] group-hover:text-[#047C58] transition-colors border-b-transparent">
                  {blog.title}
                </h2>
                <p className="text-[#8C886B] line-clamp-3 mb-6 flex-grow leading-relaxed">
                  {blog.summary}
                </p>
                <span className="text-[#047C58] font-medium flex items-center gap-2 mt-auto">
                  Read Article <span aria-hidden="true">&rarr;</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
