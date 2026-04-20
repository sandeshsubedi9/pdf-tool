import os
import uuid
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright is not installed. URL-to-PDF conversion will fall back to basic fetch.")

async def convert_url_to_pdf(
    url: str = "",
    html: str = "",
    page_size: str = "A4",
    orientation: str = "portrait",
    margin: str = "none",
    one_long_page: bool = False,
    hide_cookie: bool = True,
    block_ad: bool = False,
    viewport_width: int = 1280
) -> Tuple[bytes, str]:
    """
    Generate a PDF from a URL or raw HTML string using Playwright.
    Returns (pdf_bytes, output_filename).
    """
    if not PLAYWRIGHT_AVAILABLE:
        raise ValueError("Playwright is not installed on this system. "
                         "URL-to-PDF conversion requires Playwright. "
                         "Please run 'playwright install chromium' or use the Docker version.")

    # Decide filename
    if url:
        # Improved safe domain extraction
        try:
            from urllib.parse import urlparse
            safe_domain = urlparse(url).netloc.replace("www.", "")
            if not safe_domain:
                safe_domain = "page"
        except:
            safe_domain = "page"
        output_filename = f"{safe_domain}-{uuid.uuid4().hex[:6]}.pdf"
    else:
        output_filename = f"document-{uuid.uuid4().hex[:6]}.pdf"
    
    # ... (rest of the mapping code)
    # Map formats
    format_map = {
        "a4": "A4",
        "a3": "A3",
        "a5": "A5",
        "letter": "Letter",
        "legal": "Legal",
        "ledger": "Tabloid"
    }
    format_val = format_map.get(page_size.lower(), "A4")
    
    # Map margins
    margin_map = {
        "none": "0in",
        "small": "0.5in",
        "large": "1in"
    }
    margin_val = margin_map.get(margin.lower(), "0in")
    margin_dict = {"top": margin_val, "bottom": margin_val, "left": margin_val, "right": margin_val}
    
    landscape = (orientation.lower() == "landscape")
    
    if not url and not html:
        raise ValueError("Must provide either a URL or HTML content")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": viewport_width, "height": 900}
        )
        
        if block_ad:
            # very basic block ad resources
            await context.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media"] and ("ad" in route.request.url.lower() or "ads" in route.request.url.lower()) else route.continue_())

        page = await context.new_page()
        
        # Force "screen" media so the PDF renders the full desktop layout
        # instead of the website's narrow @media print styles.
        await page.emulate_media(media="screen")
        
        try:
            if url:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            else:
                await page.set_content(html, wait_until="networkidle", timeout=30000)
                
            if hide_cookie:
                # Attempt to inject CSS to hide common cookie banners
                await page.add_style_tag(content="""
                    [id*="cookie" i], [class*="cookie" i], 
                    [id*="consent" i], [class*="consent" i],
                    .cookie-banner, #cookie-notice, #cc-main, .cc-window {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                    }
                """)
        except Exception as e:
            logger.error(f"Error loading page in Playwright: {e}")
            await browser.close()
            raise ValueError(f"Failed to load page: {e}")
            
        try:
            pdf_options: dict = {
                "print_background": True,
                "landscape": landscape,
                "margin": margin_dict,
            }
            
            if one_long_page:
                # Full-scroll single page: width = viewport, height = total scroll height
                dims = await page.evaluate("""() => {
                    return {
                        width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
                        height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
                    }
                }""")
                pdf_options["width"] = f"{dims['width']}px"
                pdf_options["height"] = f"{min(dims['height'], 14000)}px"
                pdf_options["margin"] = {"top": "0in", "bottom": "0in", "left": "0in", "right": "0in"}
            else:
                # Set PDF width = viewport_width so mobile/desktop layout is preserved exactly.
                # We use width+height instead of format= because format auto-scales to paper width,
                # which defeats the purpose of setting a specific screen size viewport.
                paper_dims = {
                    "a4": ("8.27in", "11.69in"),
                    "a3": ("11.69in", "16.54in"),
                    "a5": ("5.83in", "8.27in"),
                    "letter": ("8.5in", "11in"),
                    "legal": ("8.5in", "14in"),
                    "ledger": ("11in", "17in"),
                    "fit": (None, None),
                }
                
                # Get standard paper dims for the selected format
                std_w, std_h = paper_dims.get(page_size.lower(), ("8.27in", "11.69in"))
                
                # We force the PDF width to be exactly viewport_width pixels.
                # This is the "magic" that makes any screen size work on any paper.
                pdf_options["width"] = f"{viewport_width}px"
                
                # For height, we use the "long" side of the paper if portrait, 
                # or the "short" side if landscape.
                if landscape:
                    pdf_options["height"] = std_w if std_w else "8.27in"
                else:
                    pdf_options["height"] = std_h if std_h else "11.69in"
                
                # If page_size is "fit", we omit height to let it auto-break or be single page
                if page_size.lower() == "fit":
                    pdf_options.pop("height", None)

                # Ensure landscape flag is False because we are manually setting 
                # width and height to the final desired orientation.
                pdf_options["landscape"] = False
                
            pdf_bytes = await page.pdf(**pdf_options)
            
        except Exception as e:
            logger.error(f"Error generating PDF in Playwright: {e}")
            await browser.close()
            raise ValueError(f"Failed to generate PDF: {e}")
            
        await browser.close()
        
    return pdf_bytes, output_filename

async def get_rendered_html(url: str) -> Tuple[str, str]:
    """
    Fetch the fully rendered HTML of a URL using Playwright.
    Returns (html_content, title).
    """
    if not PLAYWRIGHT_AVAILABLE:
        # Minimal fallback: return a helpful error instead of crashing
        import requests
        try:
            resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
            return resp.text, "Fallback (Playwright Missing)"
        except Exception as e:
            raise ValueError(f"Playwright missing and fallback fetch failed: {e}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            html_content = await page.content()
            title = await page.title()
        except Exception as e:
            logger.error(f"Error fetching HTML in Playwright: {e}")
            await browser.close()
            raise ValueError(f"Failed to load page: {e}")
            
        await browser.close()
        
    return html_content, title

