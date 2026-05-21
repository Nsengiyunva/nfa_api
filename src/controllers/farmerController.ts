import { Request, Response } from "express";
import { Farmer, NfaBlockDetail, NfaMain, NfaGroupMember, NfaHectareDetail, NfaIndividual, NfaNok, NfaSpouseDetail  } from "../models";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";
import { Parser } from 'json2csv'
import ExcelJS from 'exceljs'


export const createFarmer = async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.create(req.body);
    res.status(201).json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
}

// Get all
export const getFarmers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const { count, rows: farmers } = await Farmer.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      farmers,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
}

// Get one
export const getFarmerById = async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id);
    if (!farmer)
      return res
        .status(404)
        .json({ success: false, message: "Farmer not found" });

    res.json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
}

// Update
export const updateFarmer = async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id);
    if (!farmer)
      return res
        .status(404)
        .json({ success: false, message: "Farmer not found" });

    await farmer.update(req.body);

    res.json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
}


export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const ranges_query = `
      SELECT 
        (CASE WHEN b.range = 'OTHER' THEN b.range_other ELSE b.range END) AS \`range\`,
        a.farmer_category,
        COUNT(a.id) AS farmers
      FROM nfa_main a
      LEFT JOIN nfa_block_details b ON a.id = b.parentID
      GROUP BY 
        (CASE WHEN b.range = 'OTHER' THEN b.range_other ELSE b.range END),
        a.farmer_category;
    `;

    const category_query = `
      SELECT farmer_category, COUNT(id) AS farmers 
      FROM nfa_main 
      GROUP BY farmer_category;
    `;

    const type_query = `
      SELECT farmer_type, COUNT(id) AS farmers 
      FROM nfa_main 
      GROUP BY farmer_type;
    `;

    const gender_query = `
      SELECT gender, COUNT(a.id) AS farmers 
      FROM nfa_main a
      LEFT JOIN nfa_individual b ON a.id = b.parentID
      WHERE gender IS NOT NULL
      GROUP BY gender;
    `;

    // Run queries
    const [ranges] = await sequelize.query(ranges_query);
    const [categories] = await sequelize.query(category_query);
    const [types] = await sequelize.query(type_query);
    const [gender] = await sequelize.query(gender_query);

    return res.json({
      success: true,
      ranges,
      categories,
      types,
      gender
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, error });
  }
}

export const fetchFarmers = async (req: Request, res: Response) => {
  try {
    const hasPagination = true;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    // FIX: default limit changed from 50 to 10 to match frontend LIMIT constant
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const start_date = req.query.start_date as string || "";
    const end_date = req.query.end_date as string || "";
    const category = req.query.category as string || ""; // OFFERED | LICENSED | REGULARIZED

    // Build dynamic WHERE clauses
    const conditions: string[] = [`a.status != 'DELETED'`];
    const replacements: Record<string, any> = {};

    if (search) {
      const isNumeric = /^\d+$/.test(search);

      if (isNumeric) {
        conditions.push(`(
          a.licenseID = :exactSearch
          OR a.licenseID LIKE :prefixSearch
          OR a.primary_contact LIKE :search
          OR a.name LIKE :search
        )`);
        replacements.exactSearch = search;
        replacements.prefixSearch = `${search}%`;
        replacements.search = `%${search}%`;
      } else {
        conditions.push(`(
          a.name LIKE :search
          OR a.email_address LIKE :search
          OR a.primary_contact LIKE :search
        )`);
        replacements.search = `%${search}%`;
      }
    }

    if (category) {
      conditions.push(`a.farmer_category = :category`);
      replacements.category = category.toUpperCase();
    }

    if (start_date && end_date) {
      conditions.push(`DATE(a.updated_at) BETWEEN :start_date AND :end_date`);
      replacements.start_date = start_date;
      replacements.end_date = end_date;
    }

    const WHERE = `WHERE ${conditions.join(" AND ")}`;

    const baseQuery = `
      SELECT DISTINCT
        a.physical_address, a.postal_address, a.tin, a.documentID, a.issue_date,
        a.stage, a.director_comments, a.executive_comments, a.id, d.gender,
        b.period, a.licenseID, a.updated_at, a.primary_contact, a.farmer_category,
        a.email_address, a.name, a.farmer_type, a.clientID, b.total_area_planted,
        b.hectares_allocated, b.rateperha, c.block_number,
        (CASE WHEN c.\`range\` = 'OTHER' THEN c.range_other ELSE c.\`range\` END) AS \`range\`,
        (CASE WHEN c.sector = 'OTHER' THEN c.sector_other ELSE c.sector END) AS sector,
        (CASE WHEN c.beat = 'OTHER' THEN c.beat_other ELSE c.beat END) AS beat,
        (CASE WHEN c.reserve = 'OTHER' THEN c.reserve_other ELSE c.reserve END) AS reserve
      FROM nfa_main a
      LEFT JOIN nfa_hectare_details b ON a.id = b.parentID
      LEFT JOIN nfa_block_details c ON a.id = c.parentID
      LEFT JOIN nfa_individual d ON a.id = d.parentID
      ${WHERE}
      ORDER BY 
        CASE 
          WHEN a.licenseID IS NULL OR a.licenseID = '' THEN 1 
          ELSE 0 
        END ASC,
        CAST(a.licenseID AS UNSIGNED) DESC,
        a.id DESC
    `;

    if (!hasPagination) {
      const farmers = await sequelize.query(baseQuery, {
        replacements,
        type: QueryTypes.SELECT,
      });
      return res.status(200).json({ success: true, records: farmers, pagination: null });
    }

    const countQuery = `
      SELECT COUNT(DISTINCT a.id) AS total
      FROM nfa_main a
      LEFT JOIN nfa_hectare_details b ON a.id = b.parentID
      LEFT JOIN nfa_block_details c ON a.id = c.parentID
      LEFT JOIN nfa_individual d ON a.id = d.parentID
      ${WHERE}
    `;

    const [countResult, farmers] = await Promise.all([
      sequelize.query<{ total: number }>(countQuery, { replacements, type: QueryTypes.SELECT }),
      sequelize.query(`${baseQuery} LIMIT :limit OFFSET :offset`, {
        replacements: { ...replacements, limit, offset },
        type: QueryTypes.SELECT,
      }),
    ]);

    const totalRecords = Number(countResult[0]?.total || 0);
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      records: farmers,
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch farmers", error });
  }
}

export const fetchFarmerByLicenseId = async (
  req: Request,
  res: Response
) => {
  try {
    const { licenseID } = req.query;

    if (!licenseID) {
      return res.status(400).json({
        success: false,
        message: "licenseID query parameter is required"
      });
    }

    const query = `
      SELECT DISTINCT
        a.physical_address,
        a.postal_address,
        a.tin,
        a.documentID,
        a.issue_date,
        a.stage,
        a.director_comments,
        a.executive_comments,
        a.id,
        d.gender,
        b.period,
        a.licenseID,
        a.updated_at,
        a.primary_contact,
        a.farmer_category,
        a.email_address,
        a.name,
        a.farmer_type,
        a.clientID,
        b.total_area_planted,
        b.hectares_allocated,
        b.rateperha,
        c.block_number,

        (
          CASE
            WHEN c.\`range\` = 'OTHER'
            THEN c.range_other
            ELSE c.\`range\`
          END
        ) AS \`range\`,

        (
          CASE
            WHEN c.sector = 'OTHER'
            THEN c.sector_other
            ELSE c.sector
          END
        ) AS sector,

        (
          CASE
            WHEN c.beat = 'OTHER'
            THEN c.beat_other
            ELSE c.beat
          END
        ) AS beat,

        (
          CASE
            WHEN c.reserve = 'OTHER'
            THEN c.reserve_other
            ELSE c.reserve
          END
        ) AS reserve

      FROM nfa_main a
      LEFT JOIN nfa_hectare_details b
        ON a.id = b.parentID

      LEFT JOIN nfa_block_details c
        ON a.id = c.parentID

      LEFT JOIN nfa_individual d
        ON a.id = d.parentID

      WHERE a.status != 'DELETED'
      AND a.licenseID = :licenseID

      LIMIT 1
    `;

    const farmer = await sequelize.query(query, {
      replacements: {
        licenseID
      },
      type: QueryTypes.SELECT
    });

    if (!farmer || farmer.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    return res.status(200).json({
      success: true,
      record: farmer[0]
    });

  } catch (error) {
    console.error("fetchFarmerByLicenseId Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer details",
      error
    });
  }
}


// export const exportFarmersCSV = async (req: Request, res: Response) => {
//   try {
//     const search     = (req.query.search as string)?.trim() || ""
//     const start_date = (req.query.start_date as string) || ""
//     const end_date   = (req.query.end_date as string) || ""
//     const category   = (req.query.category as string) || ""
//     const format     = (req.query.format as string) || "json"

//     // ── Build WHERE ───────────────────────────────────────────────────────────
//     const conditions: string[] = [`a.status != 'DELETED'`]
//     const replacements: Record<string, any> = {}

//     if (search) {
//       const isNumeric = /^\d+$/.test(search)
//       if (isNumeric) {
//         conditions.push(`(
//           a.licenseID = :exactSearch
//           OR a.licenseID LIKE :prefixSearch
//           OR a.primary_contact LIKE :search
//           OR a.name LIKE :search
//         )`)
//         replacements.exactSearch  = search
//         replacements.prefixSearch = `${search}%`
//         replacements.search       = `%${search}%`
//       } else {
//         conditions.push(`(
//           a.name LIKE :search
//           OR a.email_address LIKE :search
//           OR a.primary_contact LIKE :search
//         )`)
//         replacements.search = `%${search}%`
//       }
//     }

//     if (category) {
//       conditions.push(`a.farmer_category = :category`)
//       replacements.category = category.toUpperCase()
//     }

//     if (start_date && end_date) {
//       conditions.push(`DATE(a.updated_at) BETWEEN :start_date AND :end_date`)
//       replacements.start_date = start_date
//       replacements.end_date   = end_date
//     }

//     const WHERE = `WHERE ${conditions.join(" AND ")}`

//     // ── Query (no LIMIT / OFFSET) ─────────────────────────────────────────────
//     const query = `
//       SELECT DISTINCT
//         a.id,
//         a.documentID,
//         a.licenseID,
//         a.issue_date,
//         b.period,
//         a.expiry_date,
//         a.updated_at                                              AS date,
//         a.primary_contact,
//         a.farmer_category,
//         a.email_address,
//         a.name,
//         a.farmer_type,
//         a.status,
//         a.clientID,
//         b.hectares_allocated,
//         b.total_area_planted,
//         b.rateperha,
//         c.block_number,
//         (CASE WHEN c.\`range\`   = 'OTHER' THEN c.range_other   ELSE c.\`range\`   END) AS \`range\`,
//         (CASE WHEN c.sector      = 'OTHER' THEN c.sector_other  ELSE c.sector      END) AS sector,
//         (CASE WHEN c.beat        = 'OTHER' THEN c.beat_other    ELSE c.beat        END) AS beat,
//         (CASE WHEN c.reserve     = 'OTHER' THEN c.reserve_other ELSE c.reserve     END) AS reserve
//       FROM nfa_main a
//       LEFT JOIN nfa_hectare_details b ON a.id = b.parentID
//       LEFT JOIN nfa_block_details   c ON a.id = c.parentID
//       LEFT JOIN nfa_individual      d ON a.id = d.parentID
//       ${WHERE}
//       ORDER BY a.id DESC
//     `

//     const records = await sequelize.query<Record<string, any>>(query, {
//       replacements,
//       type: QueryTypes.SELECT,
//     })

//     if (records.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No records found matching the given filters.",
//       })
//     }

//     // ── Stream as CSV ─────────────────────────────────────────────────────────
//     if (format === "csv") {
//       const fields = [
//         { label: "ID",                  value: "id"                },
//         { label: "Document ID",         value: "documentID"        },
//         { label: "License ID",          value: "licenseID"         },
//         { label: "Issue Date",          value: "issue_date"        },
//         { label: "Period",              value: "period"            },
//         { label: "Expiry Date",         value: "expiry_date"       },
//         { label: "Date",                value: "date"              },
//         { label: "Primary Contact",     value: "primary_contact"   },
//         { label: "Farmer Category",     value: "farmer_category"   },
//         { label: "Email Address",       value: "email_address"     },
//         { label: "Farmer Name",         value: "name"              },
//         { label: "Farmer Type",         value: "farmer_type"       },
//         { label: "Farmer Status",       value: "status"            },
//         { label: "Client ID",           value: "clientID"          },
//         { label: "Hectares Allocated",  value: "hectares_allocated"},
//         { label: "Total Area Planted",  value: "total_area_planted"},
//         { label: "Management Area",     value: "range"             },
//         { label: "Sector",              value: "sector"            },
//         { label: "Beat",               value: "beat"              },
//         { label: "Block Number",        value: "block_number"      },
//         { label: "Forest Reserve",      value: "reserve"           },
//         { label: "Rate Per Hectare",    value: "rateperha"         },
//       ]

//       const parser = new Parser({ fields })
//       const csv    = parser.parse(records)

//       const filename = `Farmer_Licenses_${new Date().toISOString().slice(0, 10)}.csv`

//       res.setHeader("Content-Type", "text/csv")
//       res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
//       res.setHeader("Cache-Control", "no-store")
//       return res.status(200).send(csv)
//     }

//     // ── Default: return JSON ──────────────────────────────────────────────────
//     return res.status(200).json({
//       success: true,
//       total:   records.length,
//       records,
//     })

//   } catch (error) {
//     console.error("[exportFarmers]", error)
//     return res.status(500).json({
//       success: false,
//       message: "Export failed. Please try again later.",
//       error,
//     })
//   }
// }

export const exportFarmersCSV = async (req: Request, res: Response) => {
  try {
    const search     = (req.query.search as string)?.trim() || ""
    const start_date = (req.query.start_date as string) || ""
    const end_date   = (req.query.end_date as string) || ""
    const category   = (req.query.category as string) || ""

    // ── Build WHERE (same logic as fetchFarmers) ──────────────────────────────
    const conditions: string[] = [`a.status != 'DELETED'`]
    const replacements: Record<string, any> = {}

    if (search) {
      const isNumeric = /^\d+$/.test(search)
      if (isNumeric) {
        conditions.push(`(
          a.licenseID = :exactSearch
          OR a.licenseID LIKE :prefixSearch
          OR a.primary_contact LIKE :search
          OR a.name LIKE :search
        )`)
        replacements.exactSearch  = search
        replacements.prefixSearch = `${search}%`
        replacements.search       = `%${search}%`
      } else {
        conditions.push(`(
          a.name LIKE :search
          OR a.email_address LIKE :search
          OR a.primary_contact LIKE :search
        )`)
        replacements.search = `%${search}%`
      }
    }

    if (category) {
      conditions.push(`a.farmer_category = :category`)
      replacements.category = category.toUpperCase()
    }

    if (start_date && end_date) {
      conditions.push(`DATE(a.updated_at) BETWEEN :start_date AND :end_date`)
      replacements.start_date = start_date
      replacements.end_date   = end_date
    }

    const WHERE = `WHERE ${conditions.join(" AND ")}`

    // ── Query (no LIMIT / OFFSET) ─────────────────────────────────────────────
    const records = await sequelize.query<Record<string, any>>(`
      SELECT DISTINCT
        a.id, a.documentID, a.licenseID, a.issue_date, a.expiry_date,
        a.updated_at AS date, a.primary_contact, a.farmer_category,
        a.email_address, a.name, a.farmer_type, a.status, a.clientID,
        b.period, b.hectares_allocated, b.total_area_planted, b.rateperha,
        c.block_number,
        (CASE WHEN c.\`range\`  = 'OTHER' THEN c.range_other  ELSE c.\`range\`  END) AS \`range\`,
        (CASE WHEN c.sector     = 'OTHER' THEN c.sector_other ELSE c.sector     END) AS sector,
        (CASE WHEN c.beat       = 'OTHER' THEN c.beat_other   ELSE c.beat       END) AS beat,
        (CASE WHEN c.reserve    = 'OTHER' THEN c.reserve_other ELSE c.reserve   END) AS reserve
      FROM nfa_main a
      LEFT JOIN nfa_hectare_details b ON a.id = b.parentID
      LEFT JOIN nfa_block_details   c ON a.id = c.parentID
      LEFT JOIN nfa_individual      d ON a.id = d.parentID
      ${WHERE}
      ORDER BY
        CASE WHEN a.licenseID IS NULL OR a.licenseID = '' THEN 1 ELSE 0 END ASC,
        CAST(a.licenseID AS UNSIGNED) DESC,
        a.id DESC
    `, { replacements, type: QueryTypes.SELECT })

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: "No records found." })
    }

    // ── Build Excel workbook ──────────────────────────────────────────────────
    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Farmer Licenses")

    // Column definitions (header label + data key + width)
    worksheet.columns = [
      { header: "ID",                  key: "id",                 width: 10  },
      { header: "Document ID",         key: "documentID",         width: 18  },
      { header: "License ID",          key: "licenseID",          width: 14  },
      { header: "Issue Date",          key: "issue_date",         width: 16  },
      { header: "Period",              key: "period",             width: 12  },
      { header: "Expiry Date",         key: "expiry_date",        width: 16  },
      { header: "Date",                key: "date",               width: 20  },
      { header: "Primary Contact",     key: "primary_contact",    width: 18  },
      { header: "Farmer Category",     key: "farmer_category",    width: 18  },
      { header: "Email Address",       key: "email_address",      width: 30  },
      { header: "Farmer Name",         key: "name",               width: 30  },
      { header: "Farmer Type",         key: "farmer_type",        width: 16  },
      { header: "Farmer Status",       key: "status",             width: 14  },
      { header: "Client ID",           key: "clientID",           width: 14  },
      { header: "Hectares Allocated",  key: "hectares_allocated", width: 18  },
      { header: "Total Area Planted",  key: "total_area_planted", width: 18  },
      { header: "Management Area",     key: "range",              width: 20  },
      { header: "Sector",              key: "sector",             width: 16  },
      { header: "Beat",                key: "beat",               width: 14  },
      { header: "Block Number",        key: "block_number",       width: 14  },
      { header: "Forest Reserve",      key: "reserve",            width: 20  },
      { header: "Rate Per Hectare",    key: "rateperha",          width: 16  },
    ]

    // Style the header row
    const headerRow = worksheet.getRow(1)
    headerRow.eachCell(cell => {
      cell.font            = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill            = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5C99" } }
      cell.alignment       = { vertical: "middle", horizontal: "center" }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFAAAAAA" } }
      }
    })
    headerRow.height = 20

    // Add data rows
    records.forEach((record, i) => {
      const row = worksheet.addRow(record)
      // Alternate row shading for readability
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FA" } }
        })
      }
    })

    // Freeze the header row so it stays visible while scrolling
    worksheet.views = [{ state: "frozen", ySplit: 1 }]

    // ── Stream the .xlsx back to the client ───────────────────────────────────
    const filename = `Farmer_Licenses_${new Date().toISOString().slice(0, 10)}.xlsx`

    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Cache-Control",       "no-store")

    await workbook.xlsx.write(res)
    return res.end()

  } catch (error) {
    console.error("[exportFarmers]", error)
    return res.status(500).json({ success: false, message: "Export failed.", error })
  }
}
