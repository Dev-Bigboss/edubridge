import Head from 'next/head'

const PageHead = ({ headTitle }) => {
    return (
        <>
            <Head>
                <title>
                    {headTitle ? headTitle : "Edubridge - Help students find verified tutors for live, personalized sessions across various subjects."}
                </title>
            </Head>
        </>
    )
}

export default PageHead