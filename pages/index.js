import Layout from "@/components/layout/Layout"
import About1 from "@/components/sections/About1"
import Banner1 from "@/components/sections/Banner1"
import Brand1 from "@/components/sections/Brand1"
import Categories1 from "@/components/sections/Categories1"
import FeaturedTutors from "@/components/sections/FeaturedTutors";
import Cta1 from "@/components/sections/Cta1"
// import Instructor1 from "@/components/sections/Instructor1"
// import Newsletter1 from "@/components/sections/Newsletter1"
import Testimonial1 from "@/components/sections/Testimonial1"

export default function Home1() {
    return (
        <>
            <Layout headerStyle={1} footerStyle={1}>
                <Banner1 />
                <Brand1 />
                <About1 />
                <Categories1 />
                <Testimonial1 />
                {/* <Instructor1 /> */}
                <FeaturedTutors />
                <Cta1 />
                {/* <Blog1 /> */}
                {/* <Newsletter1 /> */}
            </Layout>
        </>
    )
}