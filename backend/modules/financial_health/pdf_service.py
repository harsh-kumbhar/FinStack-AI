from io import BytesIO
from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
)
from reportlab.pdfbase.pdfmetrics import stringWidth


class FinancialHealthPDFService:
    """
    Generates a professional FinStack AI Financial Health Report.

    Responsibilities:
    - Build PDF document
    - Add FinStack AI branding
    - Add financial health information
    - Add watermark
    - Add report metadata
    - Add disclaimer
    """

    # ------------------------------------------------------
    # Paths
    # ------------------------------------------------------

    BASE_DIR = Path(__file__).resolve().parents[2]

    LOGO_PATH = BASE_DIR / "assets" / "finstack_logo.png"

    FONT_DIR = BASE_DIR / "assets" / "fonts"

    # ------------------------------------------------------
    # Fonts
    # ------------------------------------------------------
    #
    # Brand typography mirrors the web app: 'Noto Sans' for UI/body copy
    # and 'Noto Serif' for headings and prominent figures. Falls back to
    # the built-in Helvetica / Times-Roman core fonts if the TTFs are not
    # bundled with the deployment, so PDF generation never breaks.

    SANS = "Helvetica"
    SANS_BOLD = "Helvetica-Bold"
    SANS_ITALIC = "Helvetica-Oblique"
    SERIF = "Times-Roman"
    SERIF_BOLD = "Times-Bold"

    _FONTS_REGISTERED = False

    @classmethod
    def _register_fonts(cls):

        if cls._FONTS_REGISTERED:
            return

        cls._FONTS_REGISTERED = True

        font_files = {
            "NotoSans": "NotoSans-Regular.ttf",
            "NotoSans-Bold": "NotoSans-Bold.ttf",
            "NotoSans-Italic": "NotoSans-Italic.ttf",
            "NotoSerif": "NotoSerif-Regular.ttf",
            "NotoSerif-Bold": "NotoSerif-Bold.ttf",
        }

        try:

            for font_name, file_name in font_files.items():

                font_path = cls.FONT_DIR / file_name

                if not font_path.exists():
                    return

                pdfmetrics.registerFont(
                    TTFont(font_name, str(font_path))
                )

            cls.SANS = "NotoSans"
            cls.SANS_BOLD = "NotoSans-Bold"
            cls.SANS_ITALIC = "NotoSans-Italic"
            cls.SERIF = "NotoSerif"
            cls.SERIF_BOLD = "NotoSerif-Bold"

        except Exception:
            # Silently fall back to core PDF fonts - never break report
            # generation because of a missing / corrupt font file.
            pass

    # ------------------------------------------------------
    # Colors — DigiLocker-inspired brand system
    # (Navy / Saffron / India Green, shared with the web app)
    # ------------------------------------------------------

    # Brand
    NAVY = colors.HexColor("#003580")
    NAVY2 = colors.HexColor("#0052CC")
    NAVY3 = colors.HexColor("#1565C0")

    SAFFRON = colors.HexColor("#E65C00")
    SAFFRON2 = colors.HexColor("#F4840C")
    SAFFRON_LT = colors.HexColor("#FFF3E6")

    INDIA_GREEN = colors.HexColor("#138808")
    INDIA_GREEN2 = colors.HexColor("#1B9E18")

    # Backgrounds & surfaces
    BG = colors.HexColor("#F5F7FA")
    BG2 = colors.HexColor("#EEF1F5")
    WHITE = colors.white

    # Typography
    TEXT = colors.HexColor("#1A1A2E")
    TEXT2 = colors.HexColor("#4B5563")
    TEXT3 = colors.HexColor("#9CA3AF")

    # Borders
    BORDER = colors.HexColor("#DDE3ED")
    BORDER2 = colors.HexColor("#B8C5D8")

    # Semantic states (light / solid pairs — light for fills, solid for
    # text, icons and borders, matching the web design tokens)
    SUCCESS_LT = colors.HexColor("#E6F7EF")
    SUCCESS = colors.HexColor("#0A8A4C")

    WARN_LT = colors.HexColor("#FFFBEB")
    WARN = colors.HexColor("#D97706")

    ERROR_LT = colors.HexColor("#FEE2E2")
    ERROR = colors.HexColor("#C0392B")

    INFO_LT = colors.HexColor("#EFF4FF")
    INFO = colors.HexColor("#0052CC")

    # --- Legacy aliases kept for backward compatibility ----------------
    # (in case other modules import these color names directly)
    BLUE = NAVY2
    LIGHT_BLUE = INFO_LT
    GREEN = SUCCESS
    LIGHT_GREEN = SUCCESS_LT
    ORANGE = WARN
    LIGHT_ORANGE = WARN_LT
    RED = ERROR
    LIGHT_RED = ERROR_LT
    PURPLE = NAVY2
    LIGHT_PURPLE = INFO_LT
    BACKGROUND = BG
    # ---------------------------------------------------------------

    # ------------------------------------------------------
    # Layout constants
    # ------------------------------------------------------

    PAGE_W, PAGE_H = A4
    MARGIN = 18 * mm
    CONTENT_W = PAGE_W - (2 * MARGIN)

    BANNER_H = 24 * mm
    STRIPE_H = 1.1 * mm

    # ------------------------------------------------------
    # Public API
    # ------------------------------------------------------

    @classmethod
    def generate_report(
        cls,
        report,
        user_name="FinStack User",
    ) -> bytes:
        """
        Generate the financial health PDF.

        Parameters
        ----------
        report:
            PredictionResult / report object or dictionary.

        user_name:
            Name of the authenticated user.

        Returns
        -------
        bytes
            Generated PDF bytes.
        """

        cls._register_fonts()

        # Convert Pydantic model to dictionary if required
        if hasattr(report, "model_dump"):
            report = report.model_dump()

        elif hasattr(report, "dict"):
            report = report.dict()

        buffer = BytesIO()

        generated_at = datetime.now()

        report_id = report.get(
            "report_id",
            "N/A"
        )

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=cls.MARGIN,
            leftMargin=cls.MARGIN,
            topMargin=cls.BANNER_H + cls.STRIPE_H + 10 * mm,
            bottomMargin=20 * mm,
            title="FinStack AI Financial Health Report",
            author="FinStack AI",
            subject="Personal Financial Health Report",
        )

        styles = cls._build_styles()

        story = []

        # --------------------------------------------------
        # HEADER (document title block — brand banner is
        # drawn directly on the page canvas, see
        # _draw_page_background)
        # --------------------------------------------------

        story.extend(
            cls._build_header(
                styles,
                generated_at,
            )
        )

        story.append(Spacer(1, 6 * mm))

        # --------------------------------------------------
        # REPORT INFORMATION
        # --------------------------------------------------

        story.extend(
            cls._build_report_information(
                styles,
                report,
                user_name,
                generated_at,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # FINANCIAL HEALTH SCORE
        # --------------------------------------------------

        story.extend(
            cls._build_score_section(
                styles,
                report,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # PERSONA
        # --------------------------------------------------

        story.extend(
            cls._build_persona_section(
                styles,
                report,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # SCORE BREAKDOWN
        # --------------------------------------------------

        story.extend(
            cls._build_score_breakdown(
                styles,
                report,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # FINANCIAL METRICS
        # --------------------------------------------------

        story.extend(
            cls._build_metrics_section(
                styles,
                report,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # STRENGTHS
        # --------------------------------------------------

        story.extend(
            cls._build_list_section(
                styles,
                "Financial Strengths",
                report.get("strengths", []),
                cls.SUCCESS,
                cls.SUCCESS_LT,
            )
        )

        story.append(Spacer(1, 5 * mm))

        # --------------------------------------------------
        # WEAKNESSES
        # --------------------------------------------------

        story.extend(
            cls._build_list_section(
                styles,
                "Areas for Improvement",
                report.get("weaknesses", []),
                cls.WARN,
                cls.WARN_LT,
            )
        )

        story.append(Spacer(1, 5 * mm))

        # --------------------------------------------------
        # RISKS
        # --------------------------------------------------

        story.extend(
            cls._build_list_section(
                styles,
                "Financial Risks",
                report.get("risks", []),
                cls.ERROR,
                cls.ERROR_LT,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # RECOMMENDATIONS
        # --------------------------------------------------

        story.extend(
            cls._build_recommendations_section(
                styles,
                report,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # AI SUMMARY
        # --------------------------------------------------

        story.extend(
            cls._build_ai_summary_section(
                styles,
                report,
            )
        )

        story.append(Spacer(1, 7 * mm))

        # --------------------------------------------------
        # DISCLAIMER
        # --------------------------------------------------

        story.extend(
            cls._build_disclaimer(
                styles
            )
        )

        # --------------------------------------------------
        # BUILD DOCUMENT
        # --------------------------------------------------

        def draw_page(canvas, document):
            cls._draw_page_background(
                canvas,
                document,
                user_name,
                report_id,
                generated_at,
            )

        doc.build(
            story,
            onFirstPage=draw_page,
            onLaterPages=draw_page,
        )

        pdf_bytes = buffer.getvalue()

        buffer.close()

        return pdf_bytes

    # ======================================================
    # STYLES
    # ======================================================

    @classmethod
    def _build_styles(cls):

        base = getSampleStyleSheet()

        return {

            "title": ParagraphStyle(
                "ReportTitle",
                parent=base["Title"],
                fontName=cls.SERIF_BOLD,
                fontSize=19,
                leading=23,
                textColor=cls.NAVY,
                alignment=TA_LEFT,
                spaceAfter=2,
            ),

            "subtitle": ParagraphStyle(
                "Subtitle",
                parent=base["Normal"],
                fontName=cls.SANS,
                fontSize=9.5,
                leading=13,
                textColor=cls.TEXT2,
                alignment=TA_LEFT,
            ),

            "section": ParagraphStyle(
                "Section",
                parent=base["Heading2"],
                fontName=cls.SERIF_BOLD,
                fontSize=13,
                leading=17,
                textColor=cls.NAVY,
                spaceAfter=6,
            ),

            "body": ParagraphStyle(
                "Body",
                parent=base["BodyText"],
                fontName=cls.SANS,
                fontSize=9.5,
                leading=14,
                textColor=cls.TEXT,
            ),

            "small": ParagraphStyle(
                "Small",
                parent=base["BodyText"],
                fontName=cls.SANS,
                fontSize=8,
                leading=11,
                textColor=cls.TEXT2,
            ),

            "small_label": ParagraphStyle(
                "SmallLabel",
                parent=base["Normal"],
                fontName=cls.SANS_BOLD,
                fontSize=7.5,
                leading=10,
                textColor=cls.TEXT3,
            ),

            "score": ParagraphStyle(
                "Score",
                parent=base["Title"],
                fontName=cls.SERIF_BOLD,
                fontSize=34,
                leading=38,
                textColor=cls.NAVY,
                alignment=TA_LEFT,
            ),

            "score_max": ParagraphStyle(
                "ScoreMax",
                parent=base["Normal"],
                fontName=cls.SANS,
                fontSize=10,
                leading=13,
                textColor=cls.TEXT3,
            ),

            "status": ParagraphStyle(
                "Status",
                parent=base["Normal"],
                fontName=cls.SANS_BOLD,
                fontSize=10,
                leading=13,
                textColor=cls.TEXT,
                alignment=TA_CENTER,
            ),

            "metric_name": ParagraphStyle(
                "MetricName",
                parent=base["Normal"],
                fontName=cls.SANS_BOLD,
                fontSize=8.5,
                leading=11,
                textColor=cls.TEXT,
            ),

            "metric_value": ParagraphStyle(
                "MetricValue",
                parent=base["Normal"],
                fontName=cls.SANS_BOLD,
                fontSize=9,
                leading=12,
                textColor=cls.NAVY,
            ),

            "table_header": ParagraphStyle(
                "TableHeader",
                parent=base["Normal"],
                fontName=cls.SANS_BOLD,
                fontSize=8.5,
                leading=11,
                textColor=cls.WHITE,
            ),

            "recommendation_title": ParagraphStyle(
                "RecommendationTitle",
                parent=base["Normal"],
                fontName=cls.SANS_BOLD,
                fontSize=9.5,
                leading=13,
                textColor=cls.NAVY,
            ),

            "ai_summary": ParagraphStyle(
                "AISummary",
                parent=base["BodyText"],
                fontName=cls.SANS,
                fontSize=9,
                leading=14,
                textColor=cls.TEXT,
            ),

            "disclaimer": ParagraphStyle(
                "Disclaimer",
                parent=base["BodyText"],
                fontName=cls.SANS,
                fontSize=7.5,
                leading=10.5,
                textColor=cls.TEXT3,
                alignment=TA_CENTER,
            ),

            "persona_title": ParagraphStyle(
                "PersonaTitle",
                parent=base["Heading2"],
                fontName=cls.SERIF_BOLD,
                fontSize=12.5,
                leading=16,
                textColor=cls.NAVY,
            ),
        }

    # ======================================================
    # HEADER  (in-flow document title — the brand banner
    # itself is painted on the canvas, see _paint_banner)
    # ======================================================

    @classmethod
    def _build_header(cls, styles, generated_at):

        return [
            Paragraph(
                "PERSONAL FINANCIAL HEALTH REPORT",
                styles["title"],
            ),
            Paragraph(
                "AI-powered analysis of your financial standing, "
                "habits and long-term outlook",
                styles["subtitle"],
            ),
        ]

    # ======================================================
    # REPORT INFORMATION
    # ======================================================

    @classmethod
    def _build_report_information(
        cls,
        styles,
        report,
        user_name,
        generated_at,
    ):

        report_id = report.get(
            "report_id",
            "N/A"
        )

        def cell(label, value):
            return Paragraph(
                f'<font color="{cls.TEXT3.hexval()}" size="7.5">'
                f'{label.upper()}</font><br/>'
                f'<font color="{cls.TEXT.hexval()}" size="9.5">'
                f'<b>{value}</b></font>',
                styles["small"],
            )

        data = [
            [
                cell("Report ID", cls._escape(report_id)),
                cell("Prepared For", cls._escape(user_name)),
                cell(
                    "Generated",
                    generated_at.strftime("%d %b %Y, %I:%M %p"),
                ),
            ],
        ]

        col_w = cls.CONTENT_W / 3

        table = Table(
            data,
            colWidths=[col_w, col_w, col_w],
        )

        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), cls.BG),
                    ("BOX", (0, 0), (-1, -1), 0.75, cls.BORDER),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, cls.BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ]
            )
        )

        return [table]

    # ======================================================
    # SCORE
    # ======================================================

    @classmethod
    def _build_score_section(cls, styles, report):

        score = float(
            report.get(
                "ml_health_score",
                0
            )
        )

        status = report.get(
            "health_status",
            "Unknown"
        )

        score_color, score_light = cls._get_status_colors(status)

        score_style = ParagraphStyle(
            "DynamicScore",
            parent=styles["score"],
            textColor=score_color,
        )

        score_cell = Paragraph(
            f'{score:.2f}<font size="13" color="{cls.TEXT3.hexval()}">'
            f" / 100</font>",
            score_style,
        )

        status_chip = cls._chip(
            cls._escape(status).upper(),
            score_color,
            score_light,
        )

        right_cell = Table(
            [[status_chip]],
            colWidths=[45 * mm],
        )
        right_cell.hAlign = "RIGHT"
        right_cell.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        label_cell = Paragraph(
            '<font color="%s" size="8.5"><b>FINANCIAL HEALTH SCORE'
            '</b></font>' % cls.TEXT3.hexval(),
            styles["small"],
        )

        inner = Table(
            [
                [label_cell, ""],
                [score_cell, right_cell],
            ],
            colWidths=[cls.CONTENT_W - 45 * mm - 8 * mm, 45 * mm + 8 * mm],
        )

        inner.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("SPAN", (0, 0), (1, 0)),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (0, 0), 4),
                    ("BOTTOMPADDING", (1, 0), (1, 0), 0),
                ]
            )
        )

        card = Table(
            [[inner]],
            colWidths=[cls.CONTENT_W],
        )

        card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), cls.WHITE),
                    ("BOX", (0, 0), (-1, -1), 0.75, cls.BORDER),
                    ("LINEBEFORE", (0, 0), (0, 0), 3.5, score_color),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 16),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                    ("TOPPADDING", (0, 0), (-1, -1), 14),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ]
            )
        )

        return [
            Paragraph(
                "Financial Health Score",
                styles["section"]
            ),
            card,
        ]

    # ======================================================
    # PERSONA
    # ======================================================

    @classmethod
    def _build_persona_section(cls, styles, report):

        persona = report.get(
            "persona",
            {}
        )

        title = persona.get(
            "title",
            "Financial Profile"
        )

        emoji = persona.get(
            "emoji",
            ""
        )

        description = persona.get(
            "description",
            ""
        )

        strength = persona.get(
            "strength",
            ""
        )

        focus_area = persona.get(
            "focus_area",
            ""
        )

        risk_level = persona.get(
            "risk_level",
            ""
        )

        header = Paragraph(
            f"{cls._escape(emoji)} {cls._escape(title)}"
            if emoji else cls._escape(title),
            styles["persona_title"],
        )

        body = Paragraph(
            cls._escape(description),
            styles["body"],
        )

        meta_row = Table(
            [
                [
                    cls._meta_kv("Strength", strength, styles),
                    cls._meta_kv("Focus Area", focus_area, styles),
                    cls._meta_kv("Risk Level", risk_level, styles),
                ]
            ],
            colWidths=[cls.CONTENT_W / 3] * 3,
        )

        meta_row.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        inner = [header, Spacer(1, 2 * mm), body, Spacer(1, 4 * mm), meta_row]

        card = Table(
            [[inner]],
            colWidths=[cls.CONTENT_W],
        )

        card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), cls.BG),
                    ("BOX", (0, 0), (-1, -1), 0.75, cls.BORDER),
                    ("LINEBEFORE", (0, 0), (0, 0), 3.5, cls.INFO),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ]
            )
        )

        return [card]

    @classmethod
    def _meta_kv(cls, label, value, styles):
        return Paragraph(
            f'<font color="{cls.TEXT3.hexval()}" size="7.5">'
            f"{cls._escape(label).upper()}</font><br/>"
            f'<font color="{cls.TEXT.hexval()}" size="9"><b>'
            f"{cls._escape(value)}</b></font>",
            styles["small"],
        )

    # ======================================================
    # SCORE BREAKDOWN
    # ======================================================

    @classmethod
    def _build_score_breakdown(cls, styles, report):

        breakdown = report.get(
            "score_breakdown",
            {}
        )

        if not breakdown:
            return []

        data = [
            [
                Paragraph("CATEGORY", styles["table_header"]),
                Paragraph("SCORE", styles["table_header"]),
            ]
        ]

        for name, value in breakdown.items():

            data.append(
                [
                    Paragraph(
                        cls._escape(name),
                        styles["body"]
                    ),
                    Paragraph(
                        str(value),
                        styles["metric_value"]
                    ),
                ]
            )

        table = Table(
            data,
            colWidths=[
                cls.CONTENT_W - 35 * mm,
                35 * mm,
            ],
            repeatRows=1,
        )

        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), cls.NAVY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), cls.WHITE),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.75, cls.NAVY),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.5, cls.BORDER),
                    ("ALIGN", (1, 0), (1, -1), "CENTER"),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [cls.WHITE, cls.BG],
                    ),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ]
            )
        )

        return [
            Paragraph(
                "Score Breakdown",
                styles["section"]
            ),
            table,
        ]

    # ======================================================
    # METRICS
    # ======================================================

    @classmethod
    def _build_metrics_section(cls, styles, report):

        metrics = report.get(
            "metrics",
            {}
        )

        if not metrics:
            return []

        data = [
            [
                Paragraph("METRIC", styles["table_header"]),
                Paragraph("VALUE", styles["table_header"]),
                Paragraph("STATUS", styles["table_header"]),
                Paragraph("RECOMMENDED", styles["table_header"]),
            ]
        ]

        row_styles = []

        for row_index, metric in enumerate(metrics.values(), start=1):

            name = metric.get(
                "name",
                "Metric"
            )

            value = metric.get(
                "value",
                "-"
            )

            unit = metric.get(
                "unit",
                ""
            )

            status = metric.get(
                "status",
                "-"
            )

            recommended = metric.get(
                "recommended",
                "-"
            )

            status_color, status_light = cls._get_status_colors(status)

            data.append(
                [
                    Paragraph(
                        cls._escape(name),
                        styles["metric_name"]
                    ),
                    Paragraph(
                        f"{cls._escape(str(value))} "
                        f"{cls._escape(unit)}",
                        styles["metric_value"]
                    ),
                    cls._chip(
                        cls._escape(status),
                        status_color,
                        status_light,
                    ),
                    Paragraph(
                        cls._escape(recommended),
                        styles["small"]
                    ),
                ]
            )

        table = Table(
            data,
            colWidths=[
                cls.CONTENT_W * 0.29,
                cls.CONTENT_W * 0.20,
                cls.CONTENT_W * 0.21,
                cls.CONTENT_W * 0.30,
            ],
            repeatRows=1,
        )

        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), cls.NAVY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), cls.WHITE),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.75, cls.NAVY),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.5, cls.BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [cls.WHITE, cls.BG],
                    ),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ]
            )
        )

        return [
            Paragraph(
                "Financial Metrics",
                styles["section"]
            ),
            table,
        ]

    # ======================================================
    # LIST SECTIONS  (strengths / weaknesses / risks)
    # ======================================================

    @classmethod
    def _build_list_section(
        cls,
        styles,
        title,
        items,
        accent_color,
        background_color,
    ):

        if not items:
            return []

        item_style = ParagraphStyle(
            "ListItem",
            parent=styles["body"],
            leftIndent=12,
            bulletIndent=0,
        )

        content = []

        for item in items:

            content.append(
                Paragraph(
                    f'<font color="{accent_color.hexval()}">'
                    f"&#9679;</font>&nbsp;&nbsp;"
                    f"{cls._escape(str(item))}",
                    item_style,
                )
            )

        table = Table(
            [
                [
                    content
                ]
            ],
            colWidths=[cls.CONTENT_W],
        )

        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), background_color),
                    ("LINEBEFORE", (0, 0), (0, 0), 3.5, accent_color),
                    ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ]
            )
        )

        return [
            Paragraph(
                title,
                styles["section"]
            ),
            table,
        ]

    # ======================================================
    # RECOMMENDATIONS
    # ======================================================

    @classmethod
    def _build_recommendations_section(
        cls,
        styles,
        report,
    ):

        recommendations = report.get(
            "recommendations",
            []
        )

        if not recommendations:
            return []

        elements = [
            Paragraph(
                "Personalized Action Plan",
                styles["section"]
            )
        ]

        for index, recommendation in enumerate(
            recommendations,
            start=1
        ):

            if hasattr(
                recommendation,
                "model_dump"
            ):
                recommendation = (
                    recommendation.model_dump()
                )

            title = recommendation.get(
                "title",
                "Recommendation"
            )

            priority = recommendation.get(
                "priority",
                "Medium"
            )

            current = recommendation.get(
                "current_value",
                "-"
            )

            recommended = recommendation.get(
                "recommended_value",
                "-"
            )

            reason = recommendation.get(
                "reason",
                ""
            )

            impact = recommendation.get(
                "impact",
                ""
            )

            priority_color, priority_light = cls._get_priority_colors(
                priority
            )

            header_row = Table(
                [
                    [
                        Paragraph(
                            f"{index}. {cls._escape(title)}",
                            styles["recommendation_title"],
                        ),
                        cls._chip(
                            cls._escape(priority).upper(),
                            priority_color,
                            priority_light,
                        ),
                    ]
                ],
                colWidths=[cls.CONTENT_W - 33 * mm - 28, 33 * mm + 28],
            )

            header_row.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 0), (-1, -1), 0),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ]
                )
            )

            detail = Paragraph(
                f'<font color="{cls.TEXT3.hexval()}" size="8">CURRENT'
                f'</font> {cls._escape(current)}'
                f'&nbsp;&nbsp;&#8594;&nbsp;&nbsp;'
                f'<font color="{cls.TEXT3.hexval()}" size="8">'
                f'RECOMMENDED</font> '
                f'<font color="{cls.NAVY.hexval()}"><b>'
                f'{cls._escape(recommended)}</b></font>'
                f'<br/><br/>'
                f'<b>Why it matters:</b> {cls._escape(reason)}'
                f'<br/>'
                f'<b>Expected impact:</b> {cls._escape(impact)}',
                styles["body"],
            )

            inner = [header_row, Spacer(1, 3 * mm), detail]

            table = Table(
                [[inner]],
                colWidths=[cls.CONTENT_W],
            )

            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), cls.WHITE),
                        ("BOX", (0, 0), (-1, -1), 0.75, cls.BORDER),
                        ("LINEBEFORE", (0, 0), (0, 0), 3.5, cls.NAVY2),
                        ("LEFTPADDING", (0, 0), (-1, -1), 14),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                        ("TOPPADDING", (0, 0), (-1, -1), 12),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                    ]
                )
            )

            elements.append(
                KeepTogether(
                    [
                        table,
                        Spacer(1, 4 * mm),
                    ]
                )
            )

        return elements

    # ======================================================
    # AI SUMMARY
    # ======================================================

    @classmethod
    def _build_ai_summary_section(
        cls,
        styles,
        report,
    ):

        summary = report.get(
            "ai_summary"
        )

        if not summary:
            return []

        # Basic markdown cleanup
        summary = str(summary)

        summary = summary.replace(
            "**",
            "<b>"
        )

        # Close simple bold blocks
        parts = summary.split("<b>")

        cleaned = parts[0]

        for part in parts[1:]:

            if "</b>" not in part:

                part = part.replace(
                    "\n",
                    "<br/>"
                )

                cleaned += (
                    "<b>"
                    + part
                    + "</b>"
                )

            else:

                cleaned += (
                    "<b>"
                    + part
                )

        cleaned = cleaned.replace(
            "\n",
            "<br/>"
        )

        header = Paragraph(
            f'<font color="{cls.NAVY2.hexval()}" size="9"><b>'
            f"&#10022; AI-GENERATED INSIGHT</b></font>",
            styles["small"],
        )

        body = Paragraph(
            cleaned,
            styles["ai_summary"]
        )

        inner = [header, Spacer(1, 3 * mm), body]

        table = Table(
            [[inner]],
            colWidths=[cls.CONTENT_W],
        )

        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), cls.INFO_LT),
                    ("LINEBEFORE", (0, 0), (0, 0), 3.5, cls.INFO),
                    ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ]
            )
        )

        return [
            Paragraph(
                "AI Financial Summary",
                styles["section"]
            ),
            table,
        ]

    # ======================================================
    # DISCLAIMER
    # ======================================================

    @classmethod
    def _build_disclaimer(cls, styles):

        disclaimer = (
            "<b>Disclaimer:</b> FinStack AI provides "
            "educational and informational financial insights. "
            "This report does not constitute professional "
            "financial, investment, tax, or legal advice. "
            "Users should consult a qualified professional "
            "for decisions requiring professional advice."
        )

        return [
            Table(
                [
                    [
                        Paragraph(
                            disclaimer,
                            styles["disclaimer"]
                        )
                    ]
                ],
                colWidths=[cls.CONTENT_W],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), cls.BG),
                        ("BOX", (0, 0), (-1, -1), 0.5, cls.BORDER),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                    ]
                ),
            )
        ]

    # ======================================================
    # PAGE BACKGROUND / BRAND BANNER / WATERMARK / FOOTER
    # ======================================================

    @classmethod
    def _draw_page_background(
        cls,
        canvas,
        document,
        user_name,
        report_id,
        generated_at,
    ):

        width, height = A4

        cls._paint_banner(canvas, width, height)
        cls._paint_watermark(canvas, width, height, user_name, report_id, generated_at)
        cls._paint_footer(canvas, document, width, report_id, generated_at)

    @classmethod
    def _paint_banner(cls, canvas, width, height):

        canvas.saveState()

        # Navy brand band
        canvas.setFillColor(cls.NAVY)
        canvas.rect(
            0,
            height - cls.BANNER_H,
            width,
            cls.BANNER_H,
            fill=1,
            stroke=0,
        )

        # Tricolor trust stripe beneath the band (Saffron / White / Green)
        band_y = height - cls.BANNER_H - cls.STRIPE_H
        band_w = width / 3.0

        canvas.setFillColor(cls.SAFFRON)
        canvas.rect(0, band_y, band_w, cls.STRIPE_H, fill=1, stroke=0)

        canvas.setFillColor(cls.WHITE)
        canvas.rect(band_w, band_y, band_w, cls.STRIPE_H, fill=1, stroke=0)

        canvas.setFillColor(cls.INDIA_GREEN)
        canvas.rect(
            2 * band_w, band_y, width - (2 * band_w), cls.STRIPE_H,
            fill=1, stroke=0,
        )

        # Monogram mark (vector — always crisp, no external raster asset
        # required) or the real logo file, if one is bundled.
        mark_size = 11 * mm
        mark_x = cls.MARGIN
        mark_y = height - (cls.BANNER_H / 2) - (mark_size / 2)

        if cls.LOGO_PATH.exists():

            try:
                canvas.drawImage(
                    str(cls.LOGO_PATH),
                    mark_x,
                    mark_y,
                    width=mark_size,
                    height=mark_size,
                    preserveAspectRatio=True,
                    mask="auto",
                )
            except Exception:
                cls._draw_monogram(canvas, mark_x, mark_y, mark_size)

        else:
            cls._draw_monogram(canvas, mark_x, mark_y, mark_size)

        # Wordmark
        text_x = mark_x + mark_size + 5 * mm

        canvas.setFillColor(cls.WHITE)
        canvas.setFont(cls.SERIF_BOLD, 15)
        canvas.drawString(
            text_x,
            height - (cls.BANNER_H / 2) + 1 * mm,
            "FinStack AI",
        )

        canvas.setFillColor(colors.Color(1, 1, 1, alpha=0.75))
        canvas.setFont(cls.SANS, 7.5)
        canvas.drawString(
            text_x,
            height - (cls.BANNER_H / 2) - 4.5 * mm,
            "AI-POWERED FINANCIAL INTELLIGENCE",
        )

        # Right-aligned tag
        canvas.setFillColor(cls.SAFFRON2)
        canvas.setFont(cls.SANS_BOLD, 8)
        canvas.drawRightString(
            width - cls.MARGIN,
            height - (cls.BANNER_H / 2) - 1 * mm,
            "FINANCIAL HEALTH REPORT",
        )

        canvas.restoreState()

    @classmethod
    def _draw_monogram(cls, canvas, x, y, size):

        canvas.saveState()

        canvas.setFillColor(cls.WHITE)
        canvas.roundRect(x, y, size, size, 3, fill=1, stroke=0)

        canvas.setFillColor(cls.SAFFRON)
        canvas.rect(x, y, size, 1.2 * mm, fill=1, stroke=0)

        canvas.setFillColor(cls.NAVY)
        canvas.setFont(cls.SERIF_BOLD, size * 0.55)
        canvas.drawCentredString(
            x + (size / 2),
            y + (size / 2) - (size * 0.19),
            "F",
        )

        canvas.restoreState()

    @classmethod
    def _paint_watermark(cls, canvas, width, height, user_name, report_id, generated_at):

        canvas.saveState()

        watermark = (
            f"{user_name}  •  {report_id}  •  "
            f"{generated_at.strftime('%d %b %Y %H:%M')}"
        )

        canvas.setFont(cls.SANS_BOLD, 13)
        canvas.setFillColor(colors.Color(0.0, 0.21, 0.5, alpha=0.045))

        canvas.translate(width / 2, height / 2)
        canvas.rotate(35)

        text_width = stringWidth(watermark, cls.SANS_BOLD, 13)

        canvas.drawString(-text_width / 2, 0, watermark)

        canvas.restoreState()

    @classmethod
    def _paint_footer(cls, canvas, document, width, report_id, generated_at):

        canvas.saveState()

        canvas.setStrokeColor(cls.BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(cls.MARGIN, 14 * mm, width - cls.MARGIN, 14 * mm)

        canvas.setFont(cls.SANS, 7)
        canvas.setFillColor(cls.TEXT3)

        footer = (
            f"FinStack AI  |  Report ID: {report_id}  |  Generated: "
            f"{generated_at.strftime('%d %b %Y %H:%M')}"
        )

        canvas.drawString(cls.MARGIN, 9 * mm, footer)

        canvas.setFillColor(cls.NAVY2)
        canvas.setFont(cls.SANS_BOLD, 7)
        canvas.drawRightString(
            width - cls.MARGIN,
            9 * mm,
            f"Page {document.page}",
        )

        canvas.restoreState()

    # ======================================================
    # HELPERS
    # ======================================================

    @classmethod
    def _chip(cls, text, solid_color, light_color):
        """Small rounded status/priority chip, matching the web app's
        badge component (light fill, solid text, 4pt radius)."""

        style = ParagraphStyle(
            "Chip",
            fontName=cls.SANS_BOLD,
            fontSize=7.5,
            leading=9,
            textColor=solid_color,
            alignment=TA_CENTER,
        )

        chip = Table(
            [[Paragraph(text, style)]],
        )

        chip.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), light_color),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                    ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                ]
            )
        )

        chip.hAlign = "CENTER"

        return chip

    @staticmethod
    def _escape(value):

        if value is None:
            return ""

        value = str(value)

        return (
            value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

    @classmethod
    def _get_status_color(cls, status):
        """Kept for backward compatibility — returns only the solid
        color. Prefer `_get_status_colors` for the light/solid pair."""

        return cls._get_status_colors(status)[0]

    @classmethod
    def _get_status_colors(cls, status):

        status = str(
            status or ""
        ).lower()

        if status in {
            "excellent",
            "good",
            "healthy",
        }:
            return cls.SUCCESS, cls.SUCCESS_LT

        if status in {
            "average",
            "moderate",
            "fair",
        }:
            return cls.WARN, cls.WARN_LT

        if status in {
            "poor",
            "critical",
            "high risk",
        }:
            return cls.ERROR, cls.ERROR_LT

        return cls.INFO, cls.INFO_LT

    @classmethod
    def _get_priority_colors(cls, priority):

        priority = str(priority or "").lower()

        if priority in {"high", "urgent", "critical"}:
            return cls.ERROR, cls.ERROR_LT

        if priority in {"low", "minor"}:
            return cls.SUCCESS, cls.SUCCESS_LT

        return cls.WARN, cls.WARN_LT