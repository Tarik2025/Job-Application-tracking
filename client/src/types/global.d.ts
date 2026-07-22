/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="next/navigation-types/compat/navigation" />

// CSS module declarations
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Allow side-effect CSS imports
declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}
