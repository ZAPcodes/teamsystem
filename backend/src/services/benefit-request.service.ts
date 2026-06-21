import { BenefitRequest } from "../models/BenefitRequest.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { ApiError } from "../http/ApiError.js";

export async function listCompanyBenefitRequests(companyId: string) {
  const requests = await BenefitRequest.find({ companyId })
    .sort({ createdAt: -1 })
    .populate("employeeId", "name email")
    .lean();

  return requests.map((request) => {
    const employee = request.employeeId as unknown as { _id?: unknown; name?: string; email?: string };
    return {
      id: String(request._id),
      employeeId: String(employee?._id ?? request.employeeId),
      employeeName: employee?.name ?? "Employee",
      employeeEmail: employee?.email ?? "",
      originalMessage: request.originalMessage,
      items: request.items.map((item) => ({
        name: item.name,
        description: item.description,
        category: item.category,
        link: item.link ?? undefined,
        phone: item.phone ?? undefined
      })),
      status: request.status,
      employerNote: request.employerNote ?? undefined,
      createdAt: request.createdAt.toISOString(),
      decidedAt: request.decidedAt?.toISOString()
    };
  });
}

export async function decideBenefitRequest(
  requestId: string,
  companyId: string,
  employerId: string,
  status: "approved" | "declined",
  employerNote?: string
) {
  const request = await BenefitRequest.findOne({ _id: requestId, companyId });
  if (!request) {
    throw new ApiError(404, "BENEFIT_REQUEST_NOT_FOUND", "Benefit request not found");
  }

  if (request.status !== "pending") {
    throw new ApiError(400, "BENEFIT_REQUEST_CLOSED", "This request was already decided");
  }

  request.status = status;
  request.employerNote = employerNote;
  request.decidedAt = new Date();
  request.decidedBy = employerId as never;
  await request.save();

  await Notification.create({
    userId: request.employeeId,
    type: "benefit_request",
    payload: {
      requestId: String(request._id),
      status,
      employerNote: employerNote ?? null
    },
    read: false
  });

  const populated = await BenefitRequest.findById(request._id).populate("employeeId", "name email").lean();
  const employee = populated?.employeeId as unknown as { name?: string; email?: string };

  return {
    id: String(request._id),
    employeeId: String(request.employeeId),
    employeeName: employee?.name ?? "Employee",
    employeeEmail: employee?.email ?? "",
    originalMessage: request.originalMessage,
    items: request.items.map((item) => ({
      name: item.name,
      description: item.description,
      category: item.category,
      link: item.link ?? undefined,
      phone: item.phone ?? undefined
    })),
    status: request.status,
    employerNote: request.employerNote ?? undefined,
    createdAt: request.createdAt.toISOString(),
    decidedAt: request.decidedAt?.toISOString()
  };
}
