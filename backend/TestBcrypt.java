import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class TestBcrypt {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        boolean matches = encoder.matches("admin", "$2a$10$rN.uG6RSxAQ32CNB8i7S.esJqoq.6.69ibSiOVmbuj9D/5TZxuvLi");
        System.out.println("Matches: " + matches);
    }
}
