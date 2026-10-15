import type { BuiltinSkillTranslation } from '../interfaces/builtin-skill.interface';

// Vietnamese copy of BUILTIN_SKILLS, keyed by slug. `text` maps each step or
// branch id to its translated text or condition.
export const BUILTIN_SKILLS_VI: Record<string, BuiltinSkillTranslation> = {
    'refund-policy': {
        name: 'Chính sách hoàn tiền',
        description:
            'Dùng khi khách hỏi về hoàn tiền, đổi trả, hoặc muốn hủy đơn hàng.',
        guardrails: ['Không bao giờ hứa hoàn tiền khi chưa kiểm tra được.'],
        text: {
            apologize: 'Một lời xin lỗi ngắn vì sự bất tiện.',
            order: 'Mã đơn hàng.',
            policy: 'Thời hạn hoàn tiền và các điều kiện đi kèm.',
            'eligible-yes': 'Đơn hàng đủ điều kiện hoàn tiền.',
            next: 'Các bước tiếp theo để nhận hoàn tiền.',
            alternatives:
                'Lý do đơn không đủ điều kiện, và cách đổi hàng hoặc lựa chọn khác nếu có.',
        },
    },
    'complaint-handling': {
        name: 'Xử lý khiếu nại',
        description:
            'Dùng khi khách đang bực bội, phàn nàn, hoặc báo một sự cố.',
        guardrails: [
            'Luôn bình tĩnh, lịch sự, và không bao giờ đổ lỗi cho khách.',
        ],
        text: {
            acknowledge:
                'Bạn hiểu sự khó chịu của khách, không phân bua hay bào chữa.',
            details: 'Chuyện gì đã xảy ra, kèm mã đơn hoặc ngày nếu có.',
            summary: 'Tóm tắt ngắn sự cố để chắc là bạn đã hiểu đúng.',
            'resolve-yes': 'Bạn giải quyết được với những gì bạn biết.',
            fix: 'Một bước xử lý hoặc cách giải quyết cụ thể.',
            'handoff-tell': 'Sẽ có nhân viên tiếp nhận và hỗ trợ khách.',
        },
    },
    'order-status': {
        name: 'Tình trạng đơn hàng',
        description:
            'Dùng khi khách hỏi đơn hàng đang ở đâu, hoặc khi nào được giao.',
        guardrails: [
            'Không bao giờ bịa ngày giao hàng hay trạng thái vận chuyển.',
        ],
        text: {
            order: 'Mã đơn hàng, hoặc số điện thoại dùng để đặt hàng.',
            status: 'Trạng thái hiện tại và ngày giao dự kiến, theo những gì bạn biết.',
            'late-yes': 'Đơn hàng bị giao trễ hoặc bị thất lạc.',
            'late-sorry': 'Một lời xin lỗi ngắn vì sự chậm trễ.',
            'late-tell':
                'Sẽ có nhân viên kiểm tra đơn hàng và phản hồi lại khách.',
            follow: 'Cách theo dõi đơn hàng cho đến khi nhận được.',
        },
    },
    'book-appointment': {
        name: 'Đặt lịch hẹn',
        description:
            'Dùng khi khách muốn đặt một dịch vụ, một buổi hẹn, hoặc một khung giờ.',
        guardrails: [
            'Không bao giờ hứa khung giờ còn trống khi chưa kiểm tra. Nếu không kiểm tra được, hãy nói đội ngũ sẽ xác nhận giờ hẹn.',
            'Không bao giờ chẩn đoán bệnh.',
        ],
        text: {
            service: 'Dịch vụ khách muốn đặt.',
            time: 'Ngày và giờ khách muốn hẹn.',
            contact: 'Tên và số điện thoại của khách.',
            summary:
                'Tóm tắt lịch hẹn để khách xác nhận: dịch vụ, ngày, giờ và tên.',
            'confirmed-yes': 'Khách xác nhận lịch hẹn.',
            next: 'Những việc tiếp theo, như nên đến sớm một chút hoặc cần mang theo gì.',
            reminder: 'Nhắc khách về lịch hẹn vào ngày hôm trước.',
            change: 'Khách muốn thay đổi điều gì.',
        },
    },
    'reschedule-cancel-booking': {
        name: 'Đổi hoặc hủy lịch hẹn',
        description:
            'Dùng khi khách muốn dời hoặc hủy một lịch hẹn hay đặt chỗ đã đặt trước.',
        guardrails: [
            'Không bao giờ tự thu phí hay miễn phí khi chưa có nhân viên đồng ý.',
        ],
        text: {
            booking:
                'Tên hoặc số điện thoại đã dùng để đặt, và ngày của lịch hẹn.',
            reschedule: 'Khách muốn dời lịch hẹn.',
            'new-time': 'Ngày và giờ mới khách muốn hẹn.',
            'new-summary': 'Tóm tắt lịch hẹn mới để khách xác nhận.',
            cancel: 'Khách muốn hủy lịch hẹn.',
            'cancel-policy': 'Chính sách hủy lịch, kể cả phí nếu có.',
            'cancel-confirm': 'Khách có còn muốn hủy không.',
        },
    },
    'product-recommendation': {
        name: 'Tư vấn sản phẩm',
        description:
            'Dùng khi khách chưa biết nên mua gì, hoặc hỏi sản phẩm nào hợp với mình.',
        guardrails: [
            'Chỉ gợi ý những sản phẩm bạn biết chắc là cửa hàng đang bán.',
            'Không bao giờ quảng cáo công dụng chữa bệnh hay tác dụng y khoa của sản phẩm.',
        ],
        text: {
            need: 'Khách cần sản phẩm để làm gì.',
            prefs: 'Ngân sách của khách, và size, loại da hoặc sở thích khi cần.',
            picks: 'Hai hoặc ba sản phẩm phù hợp, mỗi sản phẩm kèm giá và lý do hợp với khách.',
            'picked-yes': 'Khách chọn một sản phẩm.',
            'how-order': 'Cách đặt mua sản phẩm đó.',
            dislike: 'Khách chưa ưng điểm nào, để bạn gợi ý sản phẩm khác.',
        },
    },
    'prices-promotions': {
        name: 'Giá và khuyến mãi',
        description:
            'Dùng khi khách hỏi giá, giảm giá, voucher hoặc chương trình ưu đãi đang có.',
        guardrails: [
            'Không bao giờ tự đặt ra mức giảm giá, hay áp dụng khuyến mãi đã hết hạn.',
        ],
        text: {
            item: 'Khách đang hỏi sản phẩm hay dịch vụ nào, nếu chưa rõ.',
            price: 'Giá, và chương trình khuyến mãi đang chạy kèm điều kiện và ngày kết thúc.',
            'how-buy': 'Cách đặt mua hoặc đặt lịch.',
        },
    },
    'shipping-delivery': {
        name: 'Phí ship và giao hàng',
        description:
            'Dùng khi khách hỏi phí ship, khu vực giao hàng hoặc thời gian giao trước khi đặt.',
        guardrails: [
            'Không bao giờ hứa thời gian giao hàng khi không có căn cứ.',
        ],
        text: {
            area: 'Tỉnh/thành hoặc quận/huyện của khách.',
            fee: 'Phí ship và thời gian giao dự kiến cho khu vực đó.',
            payment:
                'Các cách thanh toán, như thanh toán khi nhận hàng (COD) hoặc chuyển khoản.',
        },
    },
    'consultation-request': {
        name: 'Đăng ký tư vấn',
        description:
            'Dùng khi khách quan tâm nhưng cần chuyên viên tư vấn trước khi quyết định.',
        guardrails: [
            'Không bao giờ chốt giá, lãi suất hay phê duyệt cuối cùng. Chuyên viên tư vấn sẽ xác nhận.',
        ],
        text: {
            interest: 'Khách đang quan tâm đến điều gì.',
            requirement: 'Ngân sách hoặc yêu cầu chính của khách.',
            contact: 'Tên, số điện thoại của khách, và giờ thuận tiện để gọi.',
            callback: 'Chuyên viên tư vấn sẽ liên hệ khách, và khoảng khi nào.',
        },
    },
    'table-reservation': {
        name: 'Đặt bàn',
        description: 'Dùng khi khách muốn đặt bàn.',
        guardrails: [
            'Không bao giờ hứa còn bàn khi chưa kiểm tra. Nếu không kiểm tra được, hãy nói đội ngũ sẽ xác nhận.',
        ],
        text: {
            party: 'Ngày, giờ và số người.',
            request:
                'Yêu cầu đặc biệt nếu có, như sinh nhật, có trẻ em hoặc khu vực ngồi.',
            contact: 'Tên và số điện thoại của khách.',
            summary:
                'Tóm tắt thông tin đặt bàn để khách xác nhận, và bàn được giữ trong bao lâu.',
        },
    },
    'room-booking': {
        name: 'Đặt phòng',
        description:
            'Dùng khi khách hỏi về phòng, phòng trống hoặc muốn đặt phòng.',
        guardrails: [
            'Không bao giờ hứa còn phòng hay một mức giá khi chưa kiểm tra. Nếu không kiểm tra được, hãy nói đội ngũ sẽ xác nhận.',
        ],
        text: {
            stay: 'Ngày nhận phòng, ngày trả phòng, và số khách.',
            rooms: 'Các loại phòng phù hợp, kèm giá mỗi đêm.',
            'chosen-yes': 'Khách chọn một phòng.',
            contact: 'Tên và số điện thoại của khách.',
            deposit: 'Cách đặt cọc để giữ phòng.',
            priority: 'Điều khách quan tâm nhất, như giá, view hoặc vị trí.',
        },
    },
    'course-enrollment': {
        name: 'Đăng ký khóa học',
        description:
            'Dùng khi khách hỏi về một khóa học hay lớp học, hoặc muốn đăng ký.',
        guardrails: ['Không bao giờ hứa hẹn kết quả hay cam kết điểm số.'],
        text: {
            goal: 'Mục tiêu và trình độ hiện tại của khách.',
            course: 'Khóa học phù hợp, kèm lịch học, thời lượng và học phí.',
            'enroll-yes': 'Khách muốn đăng ký.',
            contact: 'Tên và số điện thoại của khách.',
            next: 'Các bước tiếp theo để đăng ký.',
            trial: 'Buổi học thử hoặc buổi tư vấn miễn phí, nếu có.',
        },
    },
    'warranty-exchange': {
        name: 'Bảo hành và đổi hàng',
        description:
            'Dùng khi sản phẩm bị lỗi, sai size, hoặc khách muốn đổi hàng.',
        guardrails: [
            'Không bao giờ đồng ý đổi hàng ngoài chính sách khi chưa có nhân viên duyệt.',
        ],
        text: {
            issue: 'Mã đơn hàng và sản phẩm bị vấn đề gì, kèm hình ảnh nếu được.',
            policy: 'Chính sách bảo hành hoặc đổi hàng áp dụng cho trường hợp này.',
            'qualifies-yes': 'Sản phẩm đủ điều kiện theo chính sách.',
            return: 'Cách gửi trả hoặc mang sản phẩm đến cửa hàng.',
            'why-not': 'Lý do sản phẩm không đủ điều kiện.',
            'disagree-yes': 'Khách không đồng ý.',
            'disagree-tell':
                'Sẽ có nhân viên xem xét lại trường hợp của khách.',
        },
    },
    'talk-to-a-person': {
        name: 'Gặp nhân viên',
        description:
            'Dùng khi khách muốn nói chuyện với người thật, hoặc bạn không thể hỗ trợ yêu cầu của khách.',
        guardrails: ['Không bao giờ giả vờ là người thật.'],
        text: {
            summary:
                'Tóm tắt ngắn khách cần gì, để nhân viên không phải hỏi lại.',
            'handoff-tell':
                'Sẽ có nhân viên tiếp nhận, và giờ làm việc nếu hiện đang ngoài giờ.',
        },
    },
};
