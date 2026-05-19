import { Request, Response } from "express";
import { Farmer, NfaBlockDetail, NfaMain, NfaGroupMember, NfaHectareDetail, NfaIndividual, NfaNok, NfaSpouseDetail  } from "../models";
import { sequelize } from "../models";
import { QueryTypes } from "sequelize";
// Create
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
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
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
        // Numeric input: match licenseID exactly or as prefix to avoid
        // false positives from phone numbers containing the digits.
        // Still fuzzy-match name and primary_contact as a fallback.
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
        // Text input: search name and email only — exclude licenseID to
        // avoid accidental digit matches inside phone numbers.
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
      ORDER BY a.id DESC
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



// export const fetchFarmers = async (req: Request, res: Response) => {
//   try {
//     const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

//     const baseQuery = `
//       SELECT DISTINCT
//         a.physical_address,
//         a.postal_address,
//         a.tin,
//         a.documentID,
//         a.issue_date,
//         a.stage,
//         a.director_comments,
//         a.executive_comments,
//         a.id,
//         d.gender,
//         b.period,
//         a.licenseID,
//         a.updated_at,
//         a.primary_contact,
//         a.farmer_category,
//         a.email_address,
//         a.name,
//         a.farmer_type,
//         a.clientID,
//         b.total_area_planted,
//         b.hectares_allocated,
//         b.rateperha,
//         c.block_number,

//         (CASE WHEN c.\`range\` = 'OTHER' THEN c.range_other ELSE c.\`range\` END) AS \`range\`,
//         (CASE WHEN c.sector = 'OTHER' THEN c.sector_other ELSE c.sector END) AS sector,
//         (CASE WHEN c.beat = 'OTHER' THEN c.beat_other ELSE c.beat END) AS beat,
//         (CASE WHEN c.reserve = 'OTHER' THEN c.reserve_other ELSE c.reserve END) AS reserve

//       FROM nfa_main a
//       LEFT JOIN nfa_hectare_details b ON a.id = b.parentID
//       LEFT JOIN nfa_block_details c ON a.id = c.parentID
//       LEFT JOIN nfa_individual d ON a.id = d.parentID
//       WHERE a.status != 'DELETED'
//       ORDER BY a.id DESC
//     `;

//     // ── No pagination → return everything ────────────────────────────────────
//     if (!hasPagination) {
//       const farmers = await sequelize.query(baseQuery, {
//         type: QueryTypes.SELECT,
//       });

//       return res.status(200).json({
//         success: true,
//         records: farmers,
//         pagination: null,
//       });
//     }

//     // ── Paginated ─────────────────────────────────────────────────────────────
//     const page = Math.max(1, parseInt(req.query.page as string) || 1);
//     const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
//     const offset = (page - 1) * limit;

//     const countQuery = `
//       SELECT COUNT(DISTINCT a.id) AS total
//       FROM nfa_main a
//       LEFT JOIN nfa_hectare_details b ON a.id = b.parentID
//       LEFT JOIN nfa_block_details c ON a.id = c.parentID
//       LEFT JOIN nfa_individual d ON a.id = d.parentID
//       WHERE a.status != 'DELETED'
//     `;

//     const [countResult, farmers] = await Promise.all([
//       sequelize.query<{ total: number }>(countQuery, { type: QueryTypes.SELECT }),
//       sequelize.query(`${baseQuery} LIMIT :limit OFFSET :offset`, {
//         replacements: { limit, offset },
//         type: QueryTypes.SELECT,
//       }),
//     ]);

//     const totalRecords = Number(countResult[0]?.total || 0);
//     const totalPages = Math.ceil(totalRecords / limit);

//     return res.status(200).json({
//       success: true,
//       records: farmers,
//       pagination: {
//         total: totalRecords,
//         page,
//         limit,
//         totalPages,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1,
//       },
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch farmers",
//       error,
//     });
//   }
// };

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

