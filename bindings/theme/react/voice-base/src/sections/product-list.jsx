// import axios from 'axios';
// import { useEffect, useState } from 'react';
// import { Helmet } from 'react-helmet-async';
// import { useSpeechRecognition } from 'react-speech-recognition';
// import { ProductCard } from '../components/ProductCard';

// export function Component({ props }) {
//   const application_id = '672ddc7346bed2c768faf043';
//   const company_id = '9095';
//   const [productFilterList, setProductFilterList] = useState([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [companies, setCompanies] = useState([]);

//   const { transcript } = useSpeechRecognition();

//   // const state = fpi.store.getState();
//   // const id = window.APP_DATA.applicationID;
//   // const company = fpi.getters.THEME(state)?.company_id;
//   // console.log(id, company, 'ID and Company');

//   useEffect(() => {
//     fetchApplications();
//   }, []);

//   useEffect(() => {
//     if (transcript) {
//       setSearchQuery(transcript);
//       fetchApplicationProductsBaseOnFilter(transcript);
//     }
//   }, [transcript]);

//   const fetchApplicationProductsBaseOnFilter = async (query) => {
//     if (!query) return;
//     setLoading(true);
//     try {
//       const { data } = await axios.get(
//         `https://filing-pipes-minus-teens.trycloudflare.com/api/products/applications/${application_id}`,
//         {
//           headers: { 'x-company-id': company_id },
//           params: { query },
//         }
//       );
//       setProductFilterList(data.items);
//     } catch (e) {
//       console.error('Error fetching products:', e);
//     }
//     setLoading(false);
//   };

//   const fetchApplications = async () => {
//     try {
//       const { data } = await axios.get(
//         'https://filing-pipes-minus-teens.trycloudflare.com/api/application/all-applications',
//         {
//           params: { company_id },
//           headers: { 'Content-Type': 'application/json' },
//         }
//       );
//       setCompanies(data);
//     } catch (error) {
//       console.error('Error fetching applications:', error);
//     }
//   };

//   const title = props?.title?.value ?? 'Voice Search';

//   return (
//     <div>
//       <Helmet>
//         <title>{title}</title>
//       </Helmet>
//       <h1>{title}</h1>

//       <ProductCard />
//     </div>
//   );
// }

// export const settings = {
//   label: 'Voice Search',
//   name: 'voice-search',
//   props: [
//     {
//       id: 'title',
//       label: 'Page Title',
//       type: 'text',
//       default: 'Voice Search',
//       info: 'Title of the voice search page.',
//     },
//   ],
//   blocks: [],
// };

// // export { Component, settings };

import axios from 'axios';
import React,{ useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSpeechRecognition } from 'react-speech-recognition';
import { ProductCard } from '../components/ProductCard';

export function Component({ props }) {
  const application_id = '672ddc7346bed2c768faf043';
  const company_id = '9095';
  const [productFilterList, setProductFilterList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);

  const { transcript } = useSpeechRecognition();

  useEffect(() => {
    fetchApplications();
    // fetchApplicationProductsBaseOnFilter();
    // newfetchApplicationProductsBaseOnFilter();
  }, []);

  useEffect(() => {
    if (transcript) {
      console.log("raja")
      setSearchQuery(transcript);
      fetchApplicationProductsBaseOnFilter(transcript);
      newfetchApplicationProductsBaseOnFilter(transcript)
    }
  }, []);

  const fetchApplicationProductsBaseOnFilter = async (customQuery = 'Nike') => {
    setLoading(true);
    console.log('birju')
    try {
      const { data } = await axios.get(
        `https://taste-cordless-small-mardi.trycloudflare.com/api/products/applications/${application_id}`,
        {
          headers: {
            'x-company-id': company_id,
          },
          params: { query: customQuery },
          withCredentials: true,
        }
      );
      console.log(data, 'data');
      setProductFilterList(data.items || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
    setLoading(false);
  };

  const newfetchApplicationProductsBaseOnFilter = async (customQuery = 'Nike') => {
    setLoading(true);
    try {
      const url = new URL(
        `https://taste-cordless-small-mardi.trycloudflare.com/api/products/applications/${application_id}`
      );
      url.searchParams.append('query', customQuery);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-company-id': company_id,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // same as withCredentials: true in axios
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data, 'data');
      setProductFilterList(data.items || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
    setLoading(false);
  };


  const fetchApplications = async () => {
    try {
      const { data } = await axios.get(
        'https://taste-cordless-small-mardi.trycloudflare.com/api/application/all-applications',
        {
          params: { company_id },
          // params: { company_id: '9095' },
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const title = props?.title?.value ?? 'Extension Title Default';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <h1>Products List</h1>
      <ProductCard />

      {/* {!productItems.length ? (
        <h2>No Products</h2>
      ) : (
        <div class={styles.container}>
          {productItems.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      )} */}
    </div>
  );
}

// Component.serverFetch = ({ fpi }) => fpi.catalog.getProducts({});

export const settings = {
  label: 'Product List INTECH',
  name: 'product-list',
  props: [
    {
      id: 'title',
      label: 'Page Title',
      type: 'text',
      default: 'Extension Title',
      info: 'Page Title',
    },
  ],
  blocks: [],
};
