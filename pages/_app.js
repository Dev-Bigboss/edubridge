import Preloader from "@/components/elements/Preloader";
import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect, useState } from "react";
import Cursor from "@/components/elements/CursorEffect";
import { Provider } from "react-redux";
import { store } from "../features/store";
import "/public/assets/css/animate.min.css";
import "/public/assets/css/aos.css";
import "/public/assets/css/bootstrap.min.css";
import "/public/assets/css/default-icons.css";
import "/public/assets/css/flaticon-eduvalt.css";
import "/public/assets/css/fontawesome-all.min.css";
import "/public/assets/css/magnific-popup.css";
import "/public/assets/css/main.css";
import "/public/assets/css/odometer.css";
import "/public/assets/css/select2.min.css";
import "/public/assets/css/spacing.css";
import "/public/assets/css/tg-cursor.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import queryClient from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "@/styles/nprogress.css";
import { useRouter } from "next/router";
import NProgress from "nprogress";



function MyApp({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Initialize AOS
    AOS.init({ duration: 1000, mirror: true, once: true, disable: "mobile" });

    // NProgress setup
    const handleStart = () => NProgress.start();
    const handleComplete = () => NProgress.done();

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <>
      <Cursor />
      <Toaster richColors position="top-right" />
      {!loading ? (
        <QueryClientProvider client={queryClient}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Component {...pageProps} />
          </HydrationBoundary>
        </QueryClientProvider>
      ) : (
        <Preloader />
      )}
    </>
  );
}

export default MyApp;

