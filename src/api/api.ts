import axios from 'axios';

// 请求拦截
// axios.interceptors.request.use(config => {
//   return config;
// });

// 响应拦截
// axios.interceptors.response.use(config => {
//   return config;
// });

export let getHistory = (month: string | number) => {
  return axios.get(`//baike.baidu.com/cms/home/eventsOnHistory/${month}.json`);
};
