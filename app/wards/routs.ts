export async function GET() {
  const res = await fetch(
    "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Delhi_Ward_Boundary_2022/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson",
    { next: { revalidate: 86400 } } // cache 24hrs
  );
  const data = await res.json();
  return Response.json(data);
}