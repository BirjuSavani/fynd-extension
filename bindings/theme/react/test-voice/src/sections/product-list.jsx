// import React, { useEffect } from "react";

// import { useGlobalStore, useFPI } from "fdk-core/utils";
// import { Helmet } from "react-helmet-async";
// import styles from "../styles/style.css";
// import { ProductCard } from "../components/ProductCard";

// export function Component({ props }) {
//   const fpi = useFPI();
//   console.log(fpi, 'FPI');
//   const products = useGlobalStore(fpi.getters.PRODUCTS);
//   console.log(products,'PRODUCTS')
//   const productItems = products?.data?.items ?? [];
//   console.log(productItems,'PRODUCT ITEMS')
//   // useEffect(() => {
//   //   if (!productItems.length) {
//   //     fpi.catalog.getProducts({});
//   //   }
//   // }, []);

//   const title = 'Extension Title Default'

//   return (
//     <div>
//       <Helmet>
//         <title>{ title }</title>
//       </Helmet>
//       <h1>Products List</h1>

//       {/* {!productItems.length ? (
//         <h2>No Products</h2>
//       ) : (
//         <div class={styles.container}>
//           {productItems.map((product) => (
//             <ProductCard product={product} key={product.slug} />
//           ))}
//         </div>
//       )} */}
//     </div>
//   );
// }

// // Component.serverFetch = ({ fpi }) => fpi.catalog.getProducts({});

// export const settings = {
//   label: "Product List",
//   name: "product-list",
//   props: [
//     {
//       id: "title",
//       label: "Page Title",
//       type: "text",
//       default: "Extension Title",
//       info: "Page Title",
//     },
//   ],
//   blocks: [],
// };

import axios from 'axios';
import React,{ useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export function Component({ props }) {
  const application_id = '672ddc7346bed2c768faf043';
  const company_id = '9095';
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    fetchApplications();
  }, []);

  // Debounce API call when transcript updates
  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);

      // Clear previous timeout & set a new one
      const delayDebounceFn = setTimeout(() => {
        fetchApplicationProductsBaseOnFilter(transcript);
      }, 1000); // Wait 1 sec after user stops speaking

      return () => clearTimeout(delayDebounceFn); // Cleanup timeout on every re-render
    }
  }, [transcript]);

  const fetchApplicationProductsBaseOnFilter = async (query) => {
    if (!query) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `https://flows-punk-milk-timber.trycloudflare.com/api/products/applications/${application_id}`,
        {
          headers: {
            'x-company-id': company_id,
          },
          params: { query },
        }
      );
      setProductFilterList(data.items);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    try {
      const { data } = await axios.get(
        'https://flows-punk-milk-timber.trycloudflare.com/api/application/all-applications',
        {
          params: { company_id },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      setSearchQuery('');
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const title = props?.title?.value ?? 'Voice Search';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <h1>{title}</h1>

      <button onClick={toggleListening}>{listening ? 'Stop Listening' : 'Speak'}</button>
      {transcript && <p>Heard: {transcript}</p>}
    </div>
  );
}

export const settings = {
  label: 'Test Voice',
  name: 'test-voice',
  props: [
    {
      id: 'title',
      label: 'Page Title',
      type: 'text',
      default: 'Test Voice',
      info: 'Title of the voice search page.',
    },
  ],
  blocks: [],
};
