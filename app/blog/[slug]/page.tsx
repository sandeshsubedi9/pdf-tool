import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import blogs from "@/data/blogs.json";

export async function generateStaticParams() {
  return blogs.map((blog) => ({
    slug: blog.slug,
  }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const blog = blogs.find((b) => b.slug === params.slug);
  if (!blog) {
    return { title: "Blog Not Found" };
  }
  return {
    title: `${blog.title} – PDF Maya`,
    description: blog.summary,
  };
}

export default async function BlogPost(props: Props) {
  const params = await props.params;
  const blog = blogs.find((b) => b.slug === params.slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#047C58] hover:underline mb-8"
        >
          &larr; Back to Blog
        </Link>
        
        <article className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#EBEBEB]">
          <header className="mb-10 text-center border-b border-[#EBEBEB] pb-8">
            <p className="text-sm font-medium text-[#8C886B] mb-4 uppercase tracking-widest">
              {new Date(blog.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-[#1E1702] leading-tight mb-6">
              {blog.title}
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {blog.coverImage && (
              <img src={blog.coverImage} alt={blog.title} className="w-full max-h-[400px] object-cover rounded-2xl mt-8 shadow-sm border border-[#EBEBEB]" />
            )}
          </header>

          <div className="prose prose-lg max-w-none">
            {blog.content.map((block: any, index: number) => {
              if (block.type === "paragraph") {
                return (
                  <p key={index} className="mb-6 leading-relaxed text-[#5A574A]">
                    {block.text}
                  </p>
                );
              }
              if (block.type === "h2") {
                return (
                  <h2 key={index} className="text-2xl md:text-3xl font-bold text-[#1E1702] mt-12 mb-6">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "h3") {
                return (
                  <h3 key={index} className="text-xl md:text-2xl font-bold text-[#1E1702] mt-8 mb-4">
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "list") {
                return (
                  <ul key={index} className="list-disc pl-6 mb-8 space-y-3 text-[#5A574A] marker:text-[#047C58]">
                    {block.items.map((item: string, i: number) => (
                      <li key={i} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              return null;
            })}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
