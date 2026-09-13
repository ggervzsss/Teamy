const allowedTags = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "I",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SPAN",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);
const removableTags = new Set(["IFRAME", "META", "OBJECT", "SCRIPT", "STYLE"]);
const allowedStyles = new Set(["background-color", "border-color", "color", "font-style", "font-weight", "text-align", "text-decoration"]);

function sanitizeStyle(style: string) {
  return style
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [rawProperty, ...rawValueParts] = rule.split(":");
      const property = rawProperty?.trim().toLowerCase();
      const value = rawValueParts.join(":").trim();
      if (!property || !value || !allowedStyles.has(property) || /url\s*\(|expression\s*\(/i.test(value)) {
        return "";
      }
      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

function cleanNode(node: Node, documentRef: Document): Node | DocumentFragment | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName;
  if (removableTags.has(tagName)) {
    return null;
  }

  if (!allowedTags.has(tagName)) {
    const fragment = documentRef.createDocumentFragment();
    for (const child of Array.from(element.childNodes)) {
      const cleaned = cleanNode(child, documentRef);
      if (cleaned) {
        fragment.appendChild(cleaned);
      }
    }
    return fragment;
  }

  const nextElement = documentRef.createElement(tagName.toLowerCase());
  if (tagName === "A") {
    const href = element.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) || href.startsWith("mailto:")) {
      nextElement.setAttribute("href", href);
      nextElement.setAttribute("rel", "noreferrer");
      nextElement.setAttribute("target", "_blank");
    }
  }
  if (tagName === "TD" || tagName === "TH") {
    for (const attr of ["colspan", "rowspan"]) {
      const value = element.getAttribute(attr);
      if (value && /^\d{1,2}$/.test(value)) {
        nextElement.setAttribute(attr, value);
      }
    }
  }
  const sanitizedStyle = sanitizeStyle(element.getAttribute("style") || "");
  if (sanitizedStyle) {
    nextElement.setAttribute("style", sanitizedStyle);
  }

  for (const child of Array.from(element.childNodes)) {
    const cleaned = cleanNode(child, documentRef);
    if (cleaned) {
      nextElement.appendChild(cleaned);
    }
  }
  return nextElement;
}

export function sanitizeRichText(value: string) {
  if (!value.trim() || typeof window === "undefined") {
    return value.trim();
  }

  const template = document.createElement("template");
  template.innerHTML = value;
  const fragment = document.createDocumentFragment();
  for (const child of Array.from(template.content.childNodes)) {
    const cleaned = cleanNode(child, document);
    if (cleaned) {
      fragment.appendChild(cleaned);
    }
  }
  const container = document.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML.trim();
}

export function getRichTextPlainText(value: string) {
  if (!value) {
    return "";
  }
  if (typeof window === "undefined") {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const container = document.createElement("div");
  container.innerHTML = sanitizeRichText(value);
  return (container.textContent || "").replace(/\s+/g, " ").trim();
}

export function isRichTextEmpty(value: string) {
  return getRichTextPlainText(value).length === 0;
}
