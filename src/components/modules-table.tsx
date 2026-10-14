"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Edit,
  EyeIcon,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ProjectModuleListItem } from "@/lib/types/project-module"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const TECH_STACK_BADGE_CLASS = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
const MAX_TECH_STACKS = 2

interface ModulesTableProps {
  modules: ProjectModuleListItem[]
  isLoading?: boolean
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onOpen: (module: ProjectModuleListItem) => void
  onEdit: (module: ProjectModuleListItem) => void
  onDelete: (module: ProjectModuleListItem) => void
}

function TechStackBadges({ stacks }: { stacks: string[] }) {
  if (stacks.length === 0) {
    return <span className="text-sm text-muted-foreground">N/A</span>
  }
  const visible = stacks.slice(0, MAX_TECH_STACKS)
  const remaining = stacks.length - visible.length
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((stack, index) => (
        <Badge key={`${stack}-${index}`} variant="secondary" className={`text-xs ${TECH_STACK_BADGE_CLASS}`}>
          {stack}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  )
}

export function ModulesTable({
  modules,
  isLoading = false,
  totalCount,
  pageNumber,
  pageSize,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onEdit,
  onDelete,
}: ModulesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="h-[400px] animate-pulse bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px] min-w-[160px]">Name</TableHead>
              <TableHead className="w-[220px] min-w-[160px]">Main project</TableHead>
              <TableHead className="w-[220px]">Tech Stacks</TableHead>
              <TableHead className="w-[110px]">Candidates</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No modules found.
                </TableCell>
              </TableRow>
            ) : (
              modules.map((module) => (
                <TableRow
                  key={module.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOpen(module)}
                >
                  <TableCell className="max-w-[240px] font-medium">
                    <div className="truncate" title={module.name}>
                      {module.name || <span className="font-normal text-muted-foreground">N/A</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <div className="truncate" title={module.projectName}>
                      {module.projectName || <span className="text-sm text-muted-foreground">N/A</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TechStackBadges stacks={module.techStacks} />
                  </TableCell>
                  <TableCell className="tabular-nums">{module.candidateCount}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 cursor-pointer"
                        onClick={() => onOpen(module)}
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span className="sr-only">View project</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 cursor-pointer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation()
                              onEdit(module)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={(event) => {
                              event.stopPropagation()
                              onDelete(module)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {pageNumber} of {totalPages || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(1)}
              disabled={!hasPrevious}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(pageNumber - 1)}
              disabled={!hasPrevious}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(pageNumber + 1)}
              disabled={!hasNext}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNext}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Showing {totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1} to{" "}
        {Math.min(pageNumber * pageSize, totalCount)} of {totalCount} modules
      </div>
    </div>
  )
}
