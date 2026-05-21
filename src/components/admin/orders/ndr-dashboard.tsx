"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  AlertTriangle, Loader2, RefreshCw, CheckCircle2, ShieldAlert
} from "lucide-react";
import { getApiBase } from "@/lib/api-config";
import { NdrActionModal } from "./ndr-action-modal";

interface NDRItem {
  awb_number: string;
  event_date: string;
  courier_remarks: string;
  total_attempts: number;
}

export function NdrDashboard() {
  const [selectedAwb, setSelectedAwb] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data: ndrList = [], isLoading, error, refetch, isFetching } = useQuery<NDRItem[]>({
    queryKey: ["admin-ndr-exceptions"],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/shipping/ndr`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch NDR exceptions");
      const response = await res.json();
      
      // Safely default to an empty array if Xpressbees omits the data property
      return response.data || (Array.isArray(response) ? response : []);
    },
  });


  const paginatedNdrList = useMemo(() => {
    return ndrList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [ndrList, currentPage]);

  const totalPages = Math.ceil(ndrList.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [ndrList.length]);

  const handleTakeAction = (awb: string) => {
    setSelectedAwb(awb);
    setIsModalOpen(true);
  };

  const handleActionSuccess = () => {
    refetch();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-rose-900">NDR Exceptions</h1>
          <p className="text-rose-500 text-sm mt-1">
            Manage non-delivery reports and submit instructions (re-attempt, update details) to Xpressbees.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="flex items-center gap-2 px-5 py-2.5 bg-pink-50 hover:bg-pink-100 disabled:opacity-50 text-pink-700 font-bold text-xs rounded-xl tracking-wider uppercase transition-all shadow-sm border border-pink-200/50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[2rem] border border-pink-100 shadow-sm p-8">
          <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
          <p className="text-sm font-semibold text-rose-400 mt-4 tracking-wider uppercase">Loading exceptions...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 text-rose-600 rounded-[2rem] border border-pink-100 flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg text-rose-900">Failed to load NDR exceptions</p>
            <p className="text-sm text-rose-500 mt-1">{(error as Error)?.message || "An unexpected error occurred"}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl px-5 py-2.5 text-xs uppercase tracking-wider transition-all"
          >
            Try Again
          </button>
        </div>
      ) : (!Array.isArray(ndrList) || ndrList.length === 0) ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[2rem] border border-pink-100 shadow-sm p-12 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-inner mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-rose-900 mb-2">All Clear!</h3>
          <p className="text-rose-400 text-sm max-w-md mx-auto leading-relaxed">
            No active delivery exceptions require intervention right now. All shipments are moving smoothly.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-pink-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
          <div className="p-8 border-b border-pink-50 flex items-center gap-4 bg-pink-50/10">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-rose-900">Active Delivery Exceptions</h2>
              <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">
                {ndrList.length} exception{ndrList.length > 1 ? "s" : ""} require your attention
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-pink-50/20 border-b border-pink-100">
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] w-1/5">
                    AWB Number
                  </th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] w-1/5">
                    Date & Time
                  </th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] w-2/5">
                    Courier Remarks
                  </th>
                  <th className="px-8 py-5 text-center text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] w-1/10">
                    Attempts
                  </th>
                  <th className="px-8 py-5 text-right text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] w-1/10">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {Array.isArray(paginatedNdrList) && paginatedNdrList.length > 0 ? (
                  paginatedNdrList.map((ndr, index) => (
                    <tr key={ndr.awb_number} className="hover:bg-pink-50/10 transition-colors">
                      {/* AWB */}
                      <td className="px-8 py-6">
                        <span className="font-mono text-rose-900 font-semibold bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-100/50 text-sm">
                          {ndr.awb_number}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-8 py-6">
                        <span className="text-rose-500 font-medium text-sm">
                          {new Date(ndr.event_date).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="px-8 py-6">
                        <p className="text-rose-900 font-medium text-sm line-clamp-2" title={ndr.courier_remarks}>
                          {ndr.courier_remarks}
                        </p>
                      </td>

                      {/* Attempts */}
                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex items-center justify-center font-bold text-xs rounded-full px-2.5 py-1 min-w-[2.5rem] border ${
                          ndr.total_attempts >= 2 
                            ? "bg-rose-50 text-rose-600 border-rose-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {ndr.total_attempts}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleTakeAction(ndr.awb_number)}
                          className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl px-4 py-2 text-xs uppercase tracking-wider transition-all shadow-md shadow-pink-500/10 hover:shadow-pink-500/20"
                        >
                          Respond
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No NDRs found at this time. All shipments are on track!
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-8 border-t border-pink-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-pink-50/5">
              <p className="text-xs text-rose-500 font-medium">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, ndrList.length)} of {ndrList.length} exceptions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors bg-white"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, i, arr) => (
                      <Fragment key={`ndr-page-${page}`}>
                        {i > 0 && arr[i - 1] !== page - 1 && <span className="text-rose-300 px-1">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition-colors ${
                            currentPage === page 
                              ? "bg-primary text-white shadow-sm" 
                              : "text-rose-600 hover:bg-pink-50 border border-transparent hover:border-pink-200"
                          }`}
                        >
                          {page}
                        </button>
                      </Fragment>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {selectedAwb && (
        <NdrActionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAwb(null);
          }}
          awbNumber={selectedAwb}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
