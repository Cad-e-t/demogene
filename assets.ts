

export const EXAMPLE_VIDEOS = [
  {
    id: 'ex-1',
    title: 'UI Exploration',
    url: 'https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/0256a531-71d7-4e15-9a90-5cff59177b24.mp4',
    category: 'Onboarding Demo'
  },
    {
    id: 'ex-3',
    title: 'Product Launch V2',
    url: 'https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/c0fb92eb-0b17-4853-a576-98b7f899248b.mp4',
    category: 'Landing Page Video'
  }
];

export const LANDING_GALLERY_VIDEOS = [
  {
    id: 'gal-3',
    url: 'https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/outputs/c0fb92eb-0b17-4853-a576-98b7f899248b.mp4'
  }
];

export const INTERACTIVE_DEMO_INPUT = "https://ceccojjvzimljcdltjxy.supabase.co/storage/v1/object/public/uploads/inputs/output.mp4";
export const INTERACTIVE_DEMO_OUTPUT = "https://assets.productcam.site/productcam-walkthrough.mp4";

export interface Testimonial {
  id: string;
  name: string;
  handle: string;
  role: string;
  message: string;
  link: string;
  photo: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Ben Head',
    handle: '@BenHeadGPT',
    role: 'Founder',
    message: "This tool is a game changer for a high school founder like me. I can't afford to hire a design team right now so I need speed. This means I can spend less time making demos and more time coding the next feature for my app.",
    link: 'https://x.com/BenHeadGPT?s=20',
    photo: 'https://pbs.twimg.com/profile_images/1962024911637295104/dGSW3GFk_400x400.jpg'
  },
  {
    id: 't-2',
    name: 'Tejas',
    handle: '@TWadpillewar',
    role: 'Builder',
    message: "Product demos used to feel like pulling teeth... this looks like a real shortcut.",
    link: 'https://x.com/TWadpillewar?s=20',
    photo: 'https://pbs.twimg.com/profile_images/1998816660728459265/6NYcOOLI_400x400.jpg'
  },
   {
    id: 't-3',
    name: 'Maciej Nienaltowski',
    handle: '@mnienaltowski',
    role: 'Builder',
    message: "Demo videos close deals faster than pitch decks, this kills the friction between build and first sale.",
    link: 'https://x.com/mnienaltowski?s=20',
    photo: 'https://pbs.twimg.com/profile_images/1943390939776512000/ywJmG4eL_400x400.png'
  },
  {
    id: 't-5',
    name: 'Rohan',
    handle: '@rohan360d',
    role: 'Builder',
    message: "Absolutely fantastic job my friend 😍",
    link: 'https://x.com/rohan360d?s=20',
    photo: 'https://pbs.twimg.com/profile_images/1944848755095953409/tHHk7Qwn_400x400.jpg'
  }
];