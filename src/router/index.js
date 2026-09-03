import { createRouter, createWebHistory } from "vue-router";
// Static (eager) imports: the whole demo ships as one bundle, so a redeploy can
// never leave a client requesting a stale hashed route-chunk (blank-page bug).
import ProjectsListView from "@/views/ProjectsListView.vue";
import ProjectView from "@/views/ProjectView.vue";
import GeneralTab from "@/views/project/GeneralTab.vue";
import ConditionsTab from "@/views/project/ConditionsTab.vue";
import ResourcesTab from "@/views/project/ResourcesTab.vue";
import DocumentsTab from "@/views/project/DocumentsTab.vue";
import QuantitiesTab from "@/views/project/QuantitiesTab.vue";
import QuotesTab from "@/views/project/QuotesTab.vue";
import CatalogsView from "@/views/system/CatalogsView.vue";
import CatalogDetailView from "@/views/system/CatalogDetailView.vue";
import TagManagementView from "@/views/system/TagManagementView.vue";
import BoqMappingView from "@/views/system/BoqMappingView.vue";
import ResourceTypesView from "@/views/system/ResourceTypesView.vue";
import ResourceLibraryView from "@/views/system/ResourceLibraryView.vue";
import ProjectTypesView from "@/views/system/ProjectTypesView.vue";
import ProjectTemplatesView from "@/views/system/ProjectTemplatesView.vue";

const routes = [
  { path: "/", redirect: "/projects" },
  { path: "/projects", name: "projects", component: ProjectsListView },
  {
    path: "/projects/:id",
    component: ProjectView,
    props: true,
    children: [
      { path: "", redirect: (to) => `/projects/${to.params.id}/general` },
      { path: "general", name: "project-general", component: GeneralTab },
      { path: "conditions", name: "project-conditions", component: ConditionsTab },
      { path: "resources", name: "project-resources", component: ResourcesTab },
      { path: "documents", name: "project-documents", component: DocumentsTab },
      { path: "quantities/:boqId?", name: "project-quantities", component: QuantitiesTab, props: true },
      { path: "quotes", name: "project-quotes", component: QuotesTab },
    ],
  },
  { path: "/system", redirect: "/system/catalogs" },
  { path: "/system/catalogs", name: "catalogs", component: CatalogsView },
  { path: "/system/catalogs/:id", name: "catalog-detail", component: CatalogDetailView },
  { path: "/system/tags", name: "tags", component: TagManagementView },
  { path: "/system/mapping", name: "mapping", component: BoqMappingView },
  { path: "/system/resource-types", name: "resource-types", component: ResourceTypesView },
  { path: "/system/resource-library", name: "resource-library", component: ResourceLibraryView },
  { path: "/system/project-categories", name: "project-categories", component: ProjectTypesView },
  { path: "/system/project-templates", name: "project-templates", component: ProjectTemplatesView },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
