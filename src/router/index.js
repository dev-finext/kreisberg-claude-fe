import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/projects" },
  {
    path: "/projects",
    name: "projects",
    component: () => import("@/views/ProjectsListView.vue"),
  },
  {
    path: "/projects/:id",
    component: () => import("@/views/ProjectView.vue"),
    props: true,
    children: [
      { path: "", redirect: (to) => `/projects/${to.params.id}/general` },
      { path: "general", name: "project-general", component: () => import("@/views/project/GeneralTab.vue") },
      {
        path: "conditions",
        name: "project-conditions",
        component: () => import("@/views/project/ConditionsTab.vue"),
      },
      {
        path: "resources",
        name: "project-resources",
        component: () => import("@/views/project/ResourcesTab.vue"),
      },
      {
        path: "documents",
        name: "project-documents",
        component: () => import("@/views/project/DocumentsTab.vue"),
      },
      {
        path: "quantities/:boqId?",
        name: "project-quantities",
        component: () => import("@/views/project/QuantitiesTab.vue"),
        props: true,
      },
      { path: "quotes", name: "project-quotes", component: () => import("@/views/project/QuotesTab.vue") },
    ],
  },
  { path: "/system", redirect: "/system/catalogs" },
  { path: "/system/catalogs", name: "catalogs", component: () => import("@/views/system/CatalogsView.vue") },
  {
    path: "/system/catalogs/:id",
    name: "catalog-detail",
    component: () => import("@/views/system/CatalogDetailView.vue"),
  },
  { path: "/system/tags", name: "tags", component: () => import("@/views/system/TagManagementView.vue") },
  { path: "/system/mapping", name: "mapping", component: () => import("@/views/system/BoqMappingView.vue") },
  {
    path: "/system/resource-types",
    name: "resource-types",
    component: () => import("@/views/system/ResourceTypesView.vue"),
  },
  {
    path: "/system/resource-library",
    name: "resource-library",
    component: () => import("@/views/system/ResourceLibraryView.vue"),
  },
  {
    path: "/system/project-categories",
    name: "project-categories",
    component: () => import("@/views/system/ProjectTypesView.vue"),
  },
  {
    path: "/system/project-templates",
    name: "project-templates",
    component: () => import("@/views/system/ProjectTemplatesView.vue"),
  },
];

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
