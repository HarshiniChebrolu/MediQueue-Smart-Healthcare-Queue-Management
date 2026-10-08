import { Parser } from 'json2csv';

export const generateCSVReport = (data, res, filenamePrefix = 'MediQueue_Report') => {
  try {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    const filename = `${filenamePrefix}_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Error generating CSV report', error: err.message });
  }
};
