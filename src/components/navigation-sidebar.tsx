"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  UserCog,
  UserRound,
  FolderOpen,
  Building2,
  Award,
  GraduationCap,
  LayoutDashboard,
  Trophy,
  Library,
} from "lucide-react"
import { GlobalFilterDialog } from "@/components/global-filter-dialog"
import { AuthUserMenu } from "@/components/auth-user-menu"
import { useNavigationAccess } from "@/components/role-route-guard"
import {
  PageHeaderProvider,
  usePageHeaderTitle,
} from "@/contexts/page-header-context"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Navigation items configuration
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Overview — data progress, verification, and key metrics",
  },
  {
    title: "Candidates",
    url: "/candidates",
    icon: Users,
    description: "Manage candidate profiles and applications",
  },
  {
    title: "Projects",
    url: "/projects", 
    icon: FolderOpen,
    description: "View and manage ongoing projects",
  },
  {
    title: "Employers",
    url: "/employers",
    icon: Building2,
    description: "Manage employer relationships and requirements",
  },
  {
    title: "Mentors",
    url: "/mentors",
    icon: UserRound,
    description: "People candidates named as mentors and career influences",
  },
  {
    title: "Universities",
    url: "/universities",
    icon: GraduationCap,
    description: "Manage university database and institutional information",
  },
  {
    title: "Certifications",
    url: "/certifications",
    icon: Award,
    description: "Manage professional certifications and achievements",
  },
  {
    title: "Achievements",
    url: "/achievements",
    icon: Trophy,
    description: "Browse candidate achievement instances",
  },
  {
    title: "Users",
    url: "/users",
    icon: UserCog,
    description: "Manage application user accounts",
  },
] as const

// Navigation item type
type NavigationItem = {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  description: string
}

// Navigation sidebar component props
interface NavigationSidebarProps {
  /**
   * Whether the sidebar should be open by default
   * @default true
   */
  defaultOpen?: boolean
  /**
   * Custom className for the sidebar wrapper
   */
  className?: string
  /**
   * Children to render in the main content area
   */
  children?: React.ReactNode
}

export function NavigationSidebar({ 
  defaultOpen = true, 
  className,
  children 
}: NavigationSidebarProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen} className={className}>
      <PageHeaderProvider>
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <AppTopBar />
          <div className="flex-1 space-y-4 p-6">{children}</div>
        </main>
        <SidebarRail />
      </PageHeaderProvider>
    </SidebarProvider>
  )
}

function AppTopBar() {
  const pageTitle = usePageHeaderTitle()
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight">
          {pageTitle ?? "Rabz Hit List"}
        </h1>
      </div>
      <GlobalFilterDialog />
    </header>
  )
}

function isNavItemActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/"
  return pathname === url || pathname.startsWith(`${url}/`)
}

function CatalogNavItem({ pathname }: { pathname: string }) {
  const techMergeActive =
    pathname === "/catalog/merge-technologies" ||
    pathname.startsWith("/catalog/merge-technologies/")
  const tszMergeActive =
    pathname === "/catalog/merge-time-support-zones" ||
    pathname.startsWith("/catalog/merge-time-support-zones/")
  const degreeMergeActive =
    pathname === "/catalog/merge-degrees" || pathname.startsWith("/catalog/merge-degrees/")
  const majorMergeActive =
    pathname === "/catalog/merge-majors" || pathname.startsWith("/catalog/merge-majors/")
  const countryMergeActive =
    pathname === "/catalog/merge-countries" || pathname.startsWith("/catalog/merge-countries/")
  const catalogActive =
    techMergeActive ||
    tszMergeActive ||
    degreeMergeActive ||
    majorMergeActive ||
    countryMergeActive

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={catalogActive}
        tooltip="Catalog maintenance and merge tools"
        className="transition-all duration-200 ease-in-out hover:scale-[1.02]"
      >
        <Link href="/catalog/merge-technologies" className="font-medium">
          <Library className="size-4" />
          <span>Catalog</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={techMergeActive}>
            <Link href="/catalog/merge-technologies">Merge technologies</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={tszMergeActive}>
            <Link href="/catalog/merge-time-support-zones">Merge time support zones</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={degreeMergeActive}>
            <Link href="/catalog/merge-degrees">Merge degrees</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={majorMergeActive}>
            <Link href="/catalog/merge-majors">Merge majors</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={countryMergeActive}>
            <Link href="/catalog/merge-countries">Merge countries</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </SidebarMenuItem>
  )
}

function ProjectsNavItem({
  item,
  pathname,
}: {
  item: NavigationItem
  pathname: string
}) {
  const modulesActive = pathname === "/projects/modules" || pathname.startsWith("/projects/modules/")

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === "/projects"}
        tooltip={item.description}
        className="transition-all duration-200 ease-in-out hover:scale-[1.02]"
      >
        <Link href={item.url} className="font-medium">
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={modulesActive}>
            <Link href="/projects/modules">Modules</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </SidebarMenuItem>
  )
}

function AppSidebar() {
  const pathname = usePathname()
  const { canShowNavItem, canAccessCatalog } = useNavigationAccess()
  const visibleItems = navigationItems.filter((item) => canShowNavItem(item.url))

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 px-2 rounded-md transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Rabz Hit List</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2">
          {visibleItems.map((item) => {
            if (item.url === "/projects") {
              return <ProjectsNavItem key={item.title} item={item} pathname={pathname} />
            }

            const isActive = isNavItemActive(pathname, item.url)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.description}
                  className="transition-all duration-200 ease-in-out hover:scale-[1.02]"
                >
                  <Link href={item.url} className="flex items-center gap-3">
                    <item.icon className="size-4" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
          {canAccessCatalog ? <CatalogNavItem pathname={pathname} /> : null}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <AuthUserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}

// Export navigation items for potential reuse
export { navigationItems }
export type { NavigationItem }
