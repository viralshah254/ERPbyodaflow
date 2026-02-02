import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LedgerPage() {
  // Mock data
  const entries = [
    {
      id: "1",
      date: "2024-01-15",
      account: "Accounts Receivable",
      description: "Sales Invoice #INV-001",
      debit: 1250.00,
      credit: 0,
      balance: 1250.00,
    },
    {
      id: "2",
      date: "2024-01-15",
      account: "Sales Revenue",
      description: "Sales Invoice #INV-001",
      debit: 0,
      credit: 1250.00,
      balance: -1250.00,
    },
    {
      id: "3",
      date: "2024-01-16",
      account: "Accounts Payable",
      description: "Purchase Invoice #PINV-001",
      debit: 0,
      credit: 5000.00,
      balance: -5000.00,
    },
    {
      id: "4",
      date: "2024-01-16",
      account: "Inventory",
      description: "Purchase Invoice #PINV-001",
      debit: 5000.00,
      credit: 0,
      balance: 5000.00,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground">
            View all accounting entries
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search accounts or descriptions..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
          <CardDescription>
            {entries.length} entries found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell className="font-medium">{entry.account}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">
                    {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${entry.balance.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

