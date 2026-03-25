import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://9bc8pwrr.us-east.insforge.app',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDM0MzN9.6um11WukudST4dTn1M_J7zRfEVIYjo73EHVXeORrcNg',
});

export default insforge;
